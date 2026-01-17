import EmailAnalyzer from "@/components/EmailAnalyzer";
import FAQ from "@/components/faq";
import Features from "@/components/features";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <div>
      <Navbar/>
      <Hero/>
      <FAQ/>
      <Features/>
      <EmailAnalyzer/>
    </div>
  );
}
