

export default function App() {
  return (
    <>
      <h1 className="text-container z-50 w-screen h-screen flex fixed top-0 left-0 justify-center items-center text-8xl text-white opacity-80 shadow-lg">Bubbles</h1>
      <div className="min-w-screen min-h-screen relative overflow-hidden bg-gradient-to-bl from-red-700 from-10% via-slate-900 via-35%">
      <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
    <div className="gradients-container">
      <div className="g1"></div>
      <div className="g2"></div>
      <div className="g3"></div>
      <div className="g4"></div>
      <div className="g5"></div>
      <div className="interactive"></div>
    </div>
      </div>
    </>
  );
}
