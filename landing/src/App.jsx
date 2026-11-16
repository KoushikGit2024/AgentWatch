import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import WorkflowSection from './components/WorkflowSection';
import CapabilitiesSection from './components/CapabilitiesSection';
import ArchitectureSection from './components/ArchitectureSection';
import SecuritySection from './components/SecuritySection';
import SetupSection from './components/SetupSection';
import Footer from './components/Footer';
import useReveal from './hooks/useReveal';

export default function App() {
  useReveal();
  return (
    <div className="min-h-screen overflow-x-clip bg-bg-app text-text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <HeroSection />
        <WorkflowSection />
        <CapabilitiesSection />
        <ArchitectureSection />
        <SecuritySection />
        <SetupSection />
      </main>
      <Footer />
    </div>
  );
}
