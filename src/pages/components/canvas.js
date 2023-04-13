import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { FaPencilAlt, FaPaintRoller } from "react-icons/fa";

function Canvas({ player,gameData }) {
  const canvasRef = useRef(null);
  const socketRef = useRef();
  const [color, setColor] = useState("#000000");
  const [pencilSize, setPencilSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);



  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const socket = io("http://localhost:5000");

    socketRef.current = socket;

    socket.on("draw", (data) => {
      drawLine(context, data);
    });

    socket.on("clearCanvas", () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    });

    function drawLine(context, data) {
      const { x0, y0, x1, y1, color, size } = data;

      context.beginPath();
      context.arc(x0, y0, size / 2, 0, Math.PI * 2, true);
      context.fillStyle = color;
      context.fill();

      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.strokeStyle = color;
      context.lineWidth = size;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
    }

    return () => {
      socket.disconnect();
    };
  }, []);


  useEffect(() => {
    if (gameData && gameData.settings && gameData.settings.phase === "end") {
      clearCanvas();
    }
  }, [gameData]);
  
  function handleMouseDown(event) {
    startDrawing(event);
  }

  function startDrawing(event) {
    if (!player || player.role !== "drawer") return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.beginPath();
    context.arc(x, y, pencilSize / 2, 0, Math.PI * 2, true);
    context.fillStyle = color;
    context.fill();

    context.lastX = x;
    context.lastY = y;
    setIsDrawing(true);
  }

  function draw(event) {
    if (!player || player.role !== "drawer" || !isDrawing) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.beginPath();
    context.moveTo(context.lastX, context.lastY);
    context.lineTo(x, y);
    context.strokeStyle = color;
    context.lineWidth = pencilSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();

    const socket = socketRef.current;
    const data = {
      x0: context.lastX,
      y0: context.lastY,
      x1: x,
      y1: y,
      color: color,
      size: pencilSize,
    };
    socket.emit("draw", data);

    context.lastX = x;
    context.lastY = y;
  }

  function stopDrawing(event) {
    setIsDrawing(false); // Set isDrawing to false when the mouse is released
  }

  function handleColorChange(event) {
    setColor(event.target.value);
  }

  function handlePencilSizeChange(event) {
    setPencilSize(event.target.value);
  }

  function clearCanvas(event) {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Emit the clearCanvas event to the server
    socketRef.current.emit("clearCanvas");
  }

  function handleToolChange(event) {
    setTool(event.target.value);
  }

  function colorPixel(canvasData, pixelPos, fillColor) {
    canvasData.data[pixelPos] = fillColor.r;
    canvasData.data[pixelPos + 1] = fillColor.g;
    canvasData.data[pixelPos + 2] = fillColor.b;
    canvasData.data[pixelPos + 3] = 255;
  }

  function colorToRGB(color) {
    const canvas = document.createElement("canvas");
    canvas.height = 1;
    canvas.width = 1;
    const context = canvas.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return {
      r: data[0],
      g: data[1],
      b: data[2],
    };
  }

  function equalColor(color1, color2) {
    return (
      color1[0] === color2[0] &&
      color1[1] === color2[1] &&
      color1[2] === color2[2] &&
      color1[3] === color2[3]
    );
  }

  return (
    <div>
      {player && player.role === "drawer" && (
        <div className="canvas-controls">
          <div className="canvas-tool-controls">
            <div className="pencil-controls">
              <label>
                Color
                <input
                  type="color"
                  value={color}
                  onChange={handleColorChange}
                />
              </label>
              <label>
                Pencil Size
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={pencilSize}
                  onChange={handlePencilSizeChange}
                />
              </label>
            </div>
          </div>
          <img
            src="/clean.png"
            height={40}
            alt="Clear Canvas"
            onClick={clearCanvas}
            style={{ cursor: "pointer" }}
          />
        </div>
      )}
      <canvas
        ref={canvasRef}
        height={600}
        width={700}
        onMouseDown={handleMouseDown}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
      ></canvas>
      <style jsx>
        {`
          canvas {
            background-color: white;
            box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
          }
          .canvas-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            background-color: white;
            box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
            margin-bottom: 10px;
          }
          .pencil-controls {
            display: flex;
            align-items: stretch;
            column-gap: 10px;
          }
          label {
            display: flex;
            flex-direction: column;
            row-gap: 5px;
          }
        `}
      </style>
    </div>
  );
}

export default Canvas;
