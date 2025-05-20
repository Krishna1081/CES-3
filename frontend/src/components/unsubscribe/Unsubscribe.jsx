import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
const hostname = import.meta.env.VITE_API_HOSTNAME;

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle', 'loading', 'success', 'error'

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      await axios.post(`${hostname}api/suppression/${email}`);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4 text-gray-800">
          Unsubscribe
        </h1>
        {status === "success" ? (
          <p className="text-green-600 font-medium">
            You’ve been unsubscribed successfully.
          </p>
        ) : status === "error" ? (
          <p className="text-red-500 font-medium">
            Something went wrong. Please try again.
          </p>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unsubscribe <br />
              <strong>{email}</strong> from our emails?
            </p>
            <button
              onClick={handleUnsubscribe}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Processing..." : "Unsubscribe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
