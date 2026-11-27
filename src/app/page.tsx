import { homepageStructuredData, publicMetadata } from '@/lib/seo';
import Image from 'next/image';
import Link from 'next/link';import PublicPhoto from '@/components/PublicPhoto';import type {CSSProperties} from 'react';import {images,services,portfolio} from '@/lib/content';import {Camera,Clapperboard,Heart,Film,Focus,Sparkles,ArrowUpRight,Play} from 'lucide-react';

export const metadata = publicMetadata('/');

const photographers = [
  { name: 'Subhash Kumar', portrait: '/photos/pic-pro-photographer-portrait.jpg' },
  { name: 'Sashi Kumar', portrait: '/photos/sashi-kumar-portrait.png' },
  { name: 'Raj Kumar', portrait: '/photos/raj-kumar-portrait.png' },
];

export default function Home() {
  const data = homepageStructuredData();
  return <main>{data && <script type="application/ld+json" dangerouslySetInnerHTML={{
    __html: JSON.stringify(data).replace(/</g, '\\u003c'),
  }} />}<section className="hero"><PublicPhoto photo={images.hero} alt="" className="photo-cover" sizes="(max-width: 850px) max(100vw, 112vh), max(100vw, calc(150vh - 135px))" priority /><div className="container" style={{width:'100%'}}><p className="eyebrow">PIC PRO · Photography & Videography</p><h1 className="heading" style={{fontSize:'clamp(48px,7vw,108px)',maxWidth:900,margin:'22px 0'}}>Capturing Moments.<br/><em style={{color:'#f58b22'}}>Creating Memories.</em></h1><p style={{color:'#dedede',lineHeight:1.9,maxWidth:580,fontSize:17}}>From beautiful weddings to unforgettable celebrations, we transform your precious moments into timeless photographs and cinematic stories.</p><div style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:34}}><Link prefetch={false} className="btn" href="/portfolio">Explore Portfolio <ArrowUpRight size={16}/></Link><Link prefetch={false} className="btn outline" href="/booking">Book Your Shoot</Link></div></div></section><section className="section"><div className="container grid2" style={{alignItems:'center',gap:70}}><div><p className="eyebrow">The Art of Remembering</p><h2 className="heading">Every moment deserves to be <em className="gold">remembered.</em></h2><p className="muted" style={{lineHeight:2}}>We believe the most beautiful photographs are the ones that make you feel something. From the quiet anticipation before a wedding to the energy of a joyful celebration, we create imagery that tells your story.</p><Link prefetch={false} className="btn outline" href="/about">Discover Our Story</Link></div><div style={{height:510,position:'relative'}}><PublicPhoto photo={images.portrait} alt="Editorial wedding portrait" className="photo-cover" sizes="(max-width: 600px) calc(100vw - 36px), (max-width: 1240px) calc(50vw - 61px), 559px" /></div></div></section>
    <section className="section" aria-labelledby="homepage-photographer">
      <div className="container" style={{ maxWidth: 880, textAlign: 'center' }}>
        <h2 className="heading" id="homepage-photographer" style={{ margin: '0 0 36px' }}>
          Meet the <em className="gold">Photographers</em>
        </h2>
        <div className="grid3" style={{ gap: 'clamp(24px, 5vw, 60px)' }}>
          {photographers.map(({ name, portrait }) => (
            <figure key={name} style={{ margin: 0 }}>
              <div style={{
                position: 'relative', width: '100%', maxWidth: 380, aspectRatio: '1 / 1',
                borderRadius: '50%', overflow: 'hidden', marginInline: 'auto',
              }}>
                <Image
                  src={portrait}
                  alt=""
                  fill
                  sizes="(max-width: 416px) calc(100vw - 36px), (max-width: 600px) 380px, (max-width: 850px) 44vw, 250px"
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
              <figcaption style={{ marginTop: 18, fontSize: 24 }}>{name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
    <section className="section" style={{background:'#121212'}}><div className="container"><p className="eyebrow">What We Create</p><h2 className="heading">Our <em className="gold">Services</em></h2><div className="grid3" style={{marginTop:42}}>{services.slice(0,6).map(s=><Link prefetch={false} className="imagecard" key={s.slug} href={'/services/'+s.slug} style={{'--card-photo': `url(${s.image.src})`} as CSSProperties}><PublicPhoto photo={s.image} alt="" className="photo-cover" sizes="(max-width: 600px) calc(100vw - 36px), (max-width: 850px) calc(50vw - 37px), (max-width: 1240px) calc((100vw - 96px) / 3), 382px" /><div className="content"><p className="eyebrow">PIC PRO</p><h3 style={{fontSize:30,fontWeight:400,margin:'10px 0'}}>{s.title}</h3><p style={{fontSize:13,color:'#ddd'}}>{s.description}</p><span className="gold" style={{fontSize:12}}>VIEW SERVICE ↗</span></div></Link>)}</div></div></section><section className="section"><div className="container"><div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:25,flexWrap:'wrap'}}><div><p className="eyebrow">The Stories We Tell</p><h2 className="heading">Selected <em className="gold">Frames</em></h2></div><Link prefetch={false} href="/portfolio" className="btn outline">View Portfolio</Link></div><div className="masonry" style={{marginTop:40}}>{portfolio.slice(0,6).map((item,i)=><div key={i} style={{position:'relative'}}><PublicPhoto photo={item.image} alt={item.title+' — sample photography'} sizes="(max-width: 600px) calc(50vw - 26px), (max-width: 1240px) calc((100vw - 84px) / 3), 386px" /><p className="eyebrow" style={{marginBottom:24}}>{item.category} · Demo Image</p></div>)}</div></div></section><section className="section photo-backdrop" style={{textAlign:'center','--photo-overlay':'linear-gradient(#09090999,#090909d9)'} as CSSProperties}><PublicPhoto photo={images.cinematic} alt="" className="photo-cover" sizes="100vw" /><div className="container"><p className="eyebrow">Cinematic Experiences</p><h2 className="heading">Your story, <em className="gold">beautifully filmed.</em></h2><p style={{maxWidth:560,margin:'20px auto 30px',lineHeight:1.8}}>Emotion-filled films that let you relive the moments you never want to forget.</p><Link prefetch={false} href="/videos" className="btn"><Play size={16}/> Explore Films</Link></div></section><section className="section"><div className="container"><p className="eyebrow">The PIC PRO Difference</p><h2 className="heading">Made with <em className="gold">heart.</em></h2><div className="grid3" style={{marginTop:42}}>{([[Camera,'Creative Photography'],[Clapperboard,'Cinematic Storytelling'],[Focus,'Thoughtful Planning'],[Film,'Careful Editing'],[Heart,'Personalized Approach'],[Sparkles,'Timeless Memories']] as const).map(([Icon,title],i)=><div className="card" key={i} style={{padding:34}}><Icon color="#f58b22" size={28}/><h3 style={{fontSize:24,fontWeight:400}}>{title as string}</h3><p className="muted" style={{lineHeight:1.8}}>Thoughtfully crafted imagery that brings your most meaningful memories to life.</p></div>)}</div></div></section><section className="section" style={{background:'#151515',textAlign:'center'}}><div className="container"><p className="eyebrow">Let's Create Something Beautiful</p><h2 className="heading">Let’s capture your <em className="gold">special day.</em></h2><p className="muted" style={{margin:'20px auto 35px',maxWidth:560,lineHeight:1.8}}>Planning a wedding, birthday, pre-wedding shoot or special event? Share your vision with us.</p><Link prefetch={false} className="btn" href="/booking">Book Your Shoot</Link></div></section></main>}
