function Transfer() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-6">Transferring</h2>
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>0%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
            <div
              className="bg-blue-600 rounded-full h-3 transition-all duration-300"
              style={{ width: '0%' }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Speed: -- MB/s</span>
            <span>ETA: --</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Transfer;
