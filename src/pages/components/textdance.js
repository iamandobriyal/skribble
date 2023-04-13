import { useState, useEffect } from 'react';
const DanceText = ({ text = '' }) => {

  const [animationDelays, setAnimationDelays] = useState([]);

  const randomDelay = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  useEffect(() => {
    const delays = text.split('').map((letter) => randomDelay(0, 500));
    setAnimationDelays(delays);
  }, [text]);

  return (
    <div>
      <h1>
        {text.split('').map((letter, index) => (
          <span
            key={index}
            className="dance"
            style={{ animationDelay: `${animationDelays[index]}ms` }}
          >
            {letter}
          </span>
        ))}
      </h1>
      <style jsx>{`
        h1 {
          font-size: 3.5rem;
          text-align: center;
          background-color:white;
         }
        .dance {
          display: inline-block;
          animation: dance 3s ease-in-out infinite;
          font-family: 'Cabin Sketch', cursive;
        }

        @keyframes dance {
          0% {
            transform: translateX(0) skewX(0);
          }
          20% {
            transform: translateX(-5px) skewX(-5deg);
          }
          40% {
            transform: translateX(5px) skewX(5deg);
          }
          60% {
            transform: translateX(-10px) skewX(-10deg);
          }
          80% {
            transform: translateX(10px) skewX(10deg);
          }
          100% {
            transform: translateX(0) skewX(0);
          }
        }

        .dance:first-child {
          margin-right: 10px;
        }

        .dance:last-child {
          margin-left: 10px;
        }
      `}</style>
    </div>
  );
};

export default DanceText;