// Page frame for logged-in screens: a blue header band (menu + page title) that ends in a
// milk-coloured wave, then the page content on a white sheet that overlaps the band.
import Navbar from './Navbar';

const today = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function Layout({ title, subtitle, children }) {
  return (
    <>
      <header className="mt-band no-print">
        <Navbar />
        <div className="container mt-band-title">
          <h1>{title}</h1>
          <p>{subtitle || today()}</p>
        </div>
        <svg className="mt-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 32 C 240 4, 480 4, 720 28 S 1200 56, 1440 24 L1440 60 L0 60 Z" />
        </svg>
      </header>
      <main className="container mt-sheet-wrap">
        <div className="mt-sheet">{children}</div>
      </main>
    </>
  );
}
