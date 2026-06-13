function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-4">P2P Web Share</h1>
        <p className="text-gray-400 mb-8">
          Direct browser-to-browser file transfer. No uploads. No servers. Just peer-to-peer.
        </p>
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-12 hover:border-blue-500 transition-colors cursor-pointer">
          <p className="text-gray-500 text-lg">Drop your file here</p>
          <p className="text-gray-600 text-sm mt-2">or click to browse</p>
        </div>
      </div>
    </div>
  );
}

export default Landing;
