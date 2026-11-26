import { publicMetadata } from '@/lib/seo';
import BookingForm from '@/components/BookingForm';export const metadata = publicMetadata('/contact');
export default function Page(){return <main className="section"><div className="container"><div style={{textAlign:'center',marginBottom:45}}><p className="eyebrow">Let's Talk</p><h1 className="heading">Get in <em className="gold">Touch.</em></h1><p className="muted">Share your event details and we’ll get back to you.</p></div><BookingForm contact/></div></main>}
