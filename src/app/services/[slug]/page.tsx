import { serviceMetadata } from '@/lib/seo';
import {notFound} from 'next/navigation';import Link from 'next/link';import PublicPhoto from '@/components/PublicPhoto';import {services} from '@/lib/content';export async function generateStaticParams(){return services.map(s=>({slug:s.slug}))}
type ServicePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = services.find(item => item.slug === slug);
  if (!service) notFound();
  return serviceMetadata(service);
}
export default async function Page({params}:ServicePageProps){const {slug}=await params;const s=services.find(x=>x.slug===slug);if(!s)notFound();return <main><section className="hero" style={{minHeight:520}}><PublicPhoto photo={s.image} alt="" className="photo-cover" sizes={`max(100vw, ${Math.ceil(520 * s.image.width / s.image.height)}px)`} priority /><div className="container" style={{width:'100%'}}><p className="eyebrow">PIC PRO Services</p><h1 className="heading">{s.title}</h1><p style={{fontSize:18}}>{s.description}</p><Link className="btn" href="/booking">Enquire Now</Link></div></section><section className="section"><div className="container grid2"><div><p className="eyebrow">Beautifully Captured</p><h2 className="heading">Every detail. <em className="gold">Every emotion.</em></h2></div><div><p className="muted" style={{lineHeight:2}}>Our approach brings together thoughtful planning, natural moments, creative composition and careful post-production. Tell us about your event and we will create a personalized coverage proposal.</p><Link className="btn outline" href="/booking">Get Custom Quote</Link></div></div></section></main>}