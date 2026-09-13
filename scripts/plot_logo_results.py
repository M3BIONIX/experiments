"""Present the saved results with plain labels; never alter the source recordings."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'src/logo-results.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
fig,(left,right)=plt.subplots(1,2,figsize=(12,5.4),gridspec_kw={'width_ratios':[1.05,1]})
fig.patch.set_facecolor('#fafafa')
for ax in (left,right):
 ax.set_facecolor('#fafafa');ax.tick_params(length=3,color='#999999')
 for spine in ax.spines.values():spine.set_color('#aaaaaa')
left.barh(['Instagram','Google','WhatsApp','YouTube','No approach'],list(data['choice_counts'].values()),color=['#ab5f8f','#587ca6','#53936d','#b86665','#abab9f'],height=.58)
left.invert_yaxis();left.set_xlim(0,100);left.set_xlabel('Number of walking trials (out of 100)',labelpad=12);left.set_title('Where did the fly go first?',loc='left',weight='bold',pad=22)
for i,v in enumerate(data['choice_counts'].values()):left.text(v+1.5,i,str(v),va='center')
labels=['Instagram','Google','WhatsApp','YouTube','Blank image']
values=[row['pam11_spikes'] for row in data['assays']]
right.scatter(values,range(5),s=55,facecolors='#fafafa',edgecolors='#333333',linewidths=1.5,zorder=3)
right.set_yticks(range(5),labels);right.invert_yaxis();right.set_xlim(-.12,1);right.set_xticks([0,1]);right.set_xlabel('Pulses from the 15 monitored cells',labelpad=12);right.set_title('Did those cells respond to the images?',loc='left',weight='bold',pad=22)
right.axvline(0,color='#bbbbbb',linewidth=.8,zorder=1)
for i,v in enumerate(values):right.text(.07,i,f'{v} pulses',va='center',fontsize=10)
right.text(.47,2,'All five results\nare measured zeros.',va='center',ha='left',fontsize=10,color='#555555')
right.spines['left'].set_visible(False);right.tick_params(axis='y',length=0,pad=12)
fig.subplots_adjust(left=.12,right=.97,top=.82,bottom=.23,wspace=.65)
fig.text(.12,.06,'Separate-image test: 25 presentations per image, 0.2 seconds each. No reward was given.',fontsize=10,color='#555555')
fig.savefig(root/'public/reports/neural-logo/results-explained.svg',metadata={'Date':None})
