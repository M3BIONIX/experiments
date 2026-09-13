import './banner.css';
const images={clouds:{name:'cloudscape',width:1672,height:941},night:{name:'night-field',width:1536,height:1024},figure:{name:'cloud-figure',width:1672,height:941}};
export function Banner({kind='clouds'}:{kind?:keyof typeof images}) {
  const image=images[kind];
  return <div className={`banner banner-${kind} reveal`} aria-hidden="true"><img src={`/images/${image.name}.jpg`} srcSet={`/images/${image.name}-mobile.jpg 800w, /images/${image.name}.jpg ${image.width}w`} sizes="(max-width: 767px) calc(100vw - 40px), 760px" alt="" width={image.width} height={image.height} fetchPriority="high" /></div>;
}
