"""Real FlyGym/MuJoCo experiment; no connectome or innate preference model."""
import base64
import io
import json
import queue
import time
from pathlib import Path
import numpy as np
import mujoco as mj
from PIL import Image
from flygym import Simulation
from flygym.anatomy import BodySegment, JointDOF, RotationAxis
from flygym.compose import ActuatorType, FlatGroundWorld, KinematicPosePreset
from flygym.compose.fly import FlyBody
from flygym.flybody import FlyBodyActuatedDOFPreset, FlyBodyAxisOrder, FlyBodyContactBodiesPreset, FlyBodyJointPreset, FlyBodySkeleton
from flygym.utils.math import Rotation3D
from flygym.utils.mjcf import add_texture, add_material
from flygym_demo.complex_terrain import HybridTurningController, HybridControllerObservation, FlyBodyPreprogrammedSteps, apply_locomotion_action
from flygym_demo.complex_terrain.common import LocomotionAction

ROOT = Path(__file__).resolve().parent
NAMES = ['instagram', 'google', 'whatsapp', 'youtube']

def jpeg(a):
    b = io.BytesIO(); Image.fromarray(a).save(b, 'JPEG', quality=88)
    return base64.b64encode(b.getvalue()).decode()

class Experiment:
    def __init__(self, seed=1, mode='contrast', blank=False):
        self.seed, self.mode, self.blank = seed, mode, blank
        self.running = False
        self.rng = np.random.default_rng(seed)
        self.order = list(self.rng.permutation(NAMES))
        self.targets = np.array([[10, 0], [0, 10], [-10, 0], [0, -10]], dtype=float)
        f = self.fly = FlyBody(name='fly')
        f.add_joints(FlyBodySkeleton(axis_order=FlyBodyAxisOrder.YAW_ROLL_PITCH, joint_preset=FlyBodyJointPreset.LEGS_ONLY), KinematicPosePreset.FLYBODY_NEUTRAL)
        f.add_actuators(f.skeleton.get_actuated_dofs_from_preset(FlyBodyActuatedDOFPreset.LEGS_ACTIVE_ONLY), ActuatorType.POSITION, kp=100)
        f.add_leg_adhesion(); f.colorize(); f.add_vision()
        w = FlatGroundWorld(half_size=35)
        w.ground_geom.material = ''
        w.ground_geom.rgba = [0.86, 0.87, 0.84, 1]
        for i, (name, p) in enumerate(zip(self.order, self.targets)):
            add_texture(w.mjcf_root, name=name, type='2d', file=str(ROOT / 'static/logos' / ('blank.png' if blank else name+'-panel.png')))
            add_material(w.mjcf_root, name=name, texture=name, texuniform=False, rgba=[1,1,1,1], emission=0.3)
            # Vertical cards, local +Z points toward arena center; equal 5x5 mm size.
            normal = np.array([-p[0], -p[1], 0.]); normal /= np.linalg.norm(normal)
            right = np.cross([0,0,1], normal)
            xyaxes = np.r_[right, [0,0,1]]
            w.mjcf_root.worldbody.add_geom(name='panel'+str(i), type=mj.mjtGeom.mjGEOM_PLANE, pos=[*p,2.5], size=[2.5,2.5,0.01], xyaxes=xyaxes, material=name, contype=0, conaffinity=0)
        # Reproducible randomized heading, independent of brand assignment.
        heading = self.rng.uniform(-np.pi, np.pi)
        self.initial_heading = float(heading)
        w.add_fly(f, [0,0,0.7], Rotation3D('quat',[np.cos(heading/2),0,0,np.sin(heading/2)]), bodysegs_with_ground_contact=FlyBodyContactBodiesPreset.TIBIA_TARSUS_ONLY, add_ground_contact_sensors=False)
        self.sim = Simulation(w)
        dofs = [JointDOF(BodySegment(d.parent.name),BodySegment(d.child.name),RotationAxis(d.axis.value)) for d in f.get_actuated_jointdofs_order(ActuatorType.POSITION)]
        steps = FlyBodyPreprogrammedSteps()
        self.controller = HybridTurningController(timestep=self.sim.timestep, preprogrammed_steps=steps, output_dof_order=dofs, enable_adhesion=False)
        self.sim.reset(); self.controller.reset(seed=seed)
        apply_locomotion_action(self.sim, f.name, LocomotionAction(joint_angles=steps.default_pose_by_dof_order(dofs), adhesion_onoff=np.ones(6,dtype=bool)))
        self.sim.warmup()
        self.start_time = self.sim.mj_data.time
        self.body_idx = [b.name for b in f.get_bodysegs_order()].index('c_thorax')
        self.renderer = mj.Renderer(self.sim.mj_model, height=700, width=1000)
        self.camera = mj.MjvCamera(); self.camera.lookat[:] = [0,0,0]; self.camera.distance=33; self.camera.azimuth=135; self.camera.elevation=-55
        self.eye = np.zeros((2,64,64,3),dtype=np.uint8)
        self.retina = np.zeros((2,1))
        self.command = np.array([1.,1.]); self.activity=np.zeros(2)
        self.trace=[]; self.path=[]; self.min_dist=np.full(4,np.inf); self.dwell=np.zeros(4)
        self.first_entry=None; self.elapsed=0.; self.stop_reason=None
        self.sense()

    def sense(self):
        self.eye = self.sim.get_raw_vision(self.fly.name)
        self.retina = np.array([self.sim.retina.raw_image_to_hex_pxls(a).sum(axis=-1) for a in self.eye])
        # A deliberately simple contrast response, not biological brain activity.
        self.activity = np.std(self.retina,axis=1)
        if self.mode == 'straight': self.command = np.array([1.,1.])
        else:
            turn = np.clip((self.activity[0]-self.activity[1])*2, -.45,.45)
            self.command = np.array([1-turn,1+turn])

    def advance(self):
        self.sense()
        for _ in range(max(1,round(.02/self.sim.timestep))):
            obs=HybridControllerObservation.from_sim(self.sim,self.fly.name)
            action=self.controller.step(self.command,obs)
            apply_locomotion_action(self.sim,self.fly.name,action); self.sim.step()
        self.elapsed=float(self.sim.mj_data.time-self.start_time)
        pos=self.sim.get_body_positions(self.fly.name)[self.body_idx].copy()
        if not np.isfinite(pos).all(): raise RuntimeError('Non-finite physics state; trial stopped')
        distances=np.linalg.norm(self.targets-pos[:2],axis=1)
        self.min_dist=np.minimum(self.min_dist,distances)
        self.dwell += (distances<3)*.02
        if self.first_entry is None and distances.min()<3: self.first_entry=self.order[int(distances.argmin())]
        self.path.append(pos[:2].tolist())
        self.trace.append({'t':self.elapsed,'position_mm':pos.tolist(),'contrast':self.activity.tolist(),'descending':self.command.tolist(),'cpg_phase':self.controller.cpg_network.curr_phases.tolist(),'cpg_magnitude':self.controller.cpg_network.curr_magnitudes.tolist()})
        if self.elapsed >= 10: self.stop_reason='Ten simulated seconds completed'
        elif np.linalg.norm(pos[:2])>16: self.stop_reason='Fly left the 16 mm observation area'
        elif pos[2]<-.5: self.stop_reason='Fly fell below the floor'
        if self.stop_reason: self.running=False

    def state(self):
        self.renderer.update_scene(self.sim.mj_data,camera=self.camera)
        frame=self.renderer.render()
        pos=self.sim.get_body_positions(self.fly.name)[self.body_idx]
        distances=np.linalg.norm(self.targets-pos[:2],axis=1)
        return {'status':'running' if self.running else 'paused','stop_reason':self.stop_reason,'seed':self.seed,'mode':self.mode,'blank':self.blank,'elapsed':self.elapsed,'frame':jpeg(frame),'eyes':[jpeg(a) for a in self.eye], 'retina':self.retina.tolist(),'contrast':self.activity.tolist(),'descending':self.command.tolist(),'cpg_phase':self.controller.cpg_network.curr_phases.tolist(),'cpg_magnitude':self.controller.cpg_network.curr_magnitudes.tolist(),'position':pos.tolist(),'path':self.path[-1000:],'first_entry':self.first_entry,'targets':[{'name':name,'xy':p.tolist(),'distance':float(d),'minimum':float(m) if np.isfinite(m) else float(d),'dwell':float(dw)} for name,p,d,m,dw in zip(self.order,self.targets,distances,self.min_dist,self.dwell)]}

    def close(self):
        self.renderer.close()
        if self.sim.eye_renderer: self.sim.eye_renderer.close()

def worker(commands, outputs):
    exp=None
    def publish(value):
        try: outputs.put_nowait(value)
        except queue.Full:
            try: outputs.get_nowait()
            except queue.Empty: pass
            try: outputs.put_nowait(value)
            except queue.Full: pass
    try:
        exp=Experiment(); publish(exp.state())
        while True:
            changed=False
            try:
                c=commands.get(timeout=.01 if exp.running else .1)
                action=c['action']
                if action=='reset':
                    publish({'status':'loading'})
                    exp.close(); exp=Experiment(c.get('seed',1),c.get('mode','contrast'),c.get('blank',False)); changed=True
                elif action=='run':
                    exp.running=exp.stop_reason is None; changed=True
                elif action=='pause': exp.running=False; changed=True
                elif action=='export':
                    path=ROOT/'results'/'latest.json'
                    payload={'model':'FlyGym FlyBody + HybridTurningController','brain_model':None,'visual_policy':'hand-written bilateral contrast baseline','seed':exp.seed,'mode':exp.mode,'blank':exp.blank,'order':exp.order,'initial_heading_rad':exp.initial_heading,'first_entry':exp.first_entry,'stop_reason':exp.stop_reason,'source_commits':json.loads((ROOT/'results/sources.json').read_text()),'trace':exp.trace}
                    path.write_text(json.dumps(payload)); changed=True
            except queue.Empty: pass
            if exp.running: exp.advance(); changed=True
            if changed: publish(exp.state())
    except Exception as e:
        import traceback
        traceback.print_exc(); publish({'status':'error','error':str(e)})
    finally:
        if exp: exp.close()
