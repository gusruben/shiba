import { useState, useRef, useEffect } from "react";
import Head from "next/head";

function LoginModal({ onClose, onLoginSuccess, requestOtp, verifyOtp, theme }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("email"); // whether user is inputting email or otp
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (stage === "email" && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [stage]);

  const onRequest = async () => {
    if (!requestOtp) return;
    setLoading(true);
    setMessage("");
    // Get sentby from URL parameters like StartScreen does
    const urlParams = new URLSearchParams(window.location.search);
    const sentby = urlParams.get('sentby');
    const result = await requestOtp(email, sentby);
    if (result?.ok) {
      setStage("otp");
      setMessage("");
    } else {
      setMessage(result?.message || "Failed to request code.");
    }
    setLoading(false);
  };

  const onVerify = async () => {
    if (!verifyOtp) return;
    setLoading(true);
    setMessage("");
    const result = await verifyOtp(email, otp);
    if (result?.ok && result?.token) {
      onLoginSuccess?.(result.token);
      onClose();
    } else {
      // If verification fails, automatically request a new OTP
      alert("Verification failed. A new code has been sent to your email.");
      setOtp(""); // Clear the OTP input
      if (requestOtp) {
        // Get sentby from URL parameters like StartScreen does
        const urlParams = new URLSearchParams(window.location.search);
        const sentby = urlParams.get('sentby');
        const newOtpResult = await requestOtp(email, sentby);
        if (newOtpResult?.ok) {
          setMessage("New code sent. Check your email.");
        } else {
          setMessage("Failed to send new code. Please try again.");
        }
      } else {
        setMessage("Verification failed. Please request a new code.");
      }
    }
    setLoading(false);
  };

  const handleSlackLogin = () => {
    window.open(
      "https://slack.com/oauth/v2/authorize?client_id=2210535565.9361842154099&user_scope=users:read,users:read.email&redirect_uri=https://shiba.hackclub.com",
      "_blank",
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
        }}
      >
        {/* Header */}
        <div style={{ 
          display: "flex", 
          flexDirection: "row", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: "20px" 
        }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: theme.text }}>
            Login to Shiba Arcade
          </h3>
          <button
            onClick={onClose}
            style={{
              appearance: "none",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.7)",
              width: 32,
              height: 32,
              borderRadius: 9999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(0,0,0,0.65)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Email Input */}
        {stage === "email" && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: theme.text }}>
              Email Address:
            </label>
            <div style={{
              display: "flex",
              border: "1px solid rgba(0, 0, 0, 0.18)",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.75)",
              overflow: "hidden"
            }}>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orpheus@hackclub.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRequest();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  outline: "none",
                  border: "none",
                  background: "transparent",
                  fontFamily: "inherit"
                }}
              />
              <button
                onClick={onRequest}
                disabled={loading || !email.trim()}
                style={{
                  appearance: "none",
                  border: "none",
                  background: loading || !email.trim() ? "#ccc" : "linear-gradient(180deg, #ff8ec3 0%, #ff6fa5 100%)",
                  color: "#fff",
                  padding: "10px 16px",
                  cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                  fontWeight: "800",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  opacity: loading || !email.trim() ? 0.5 : 1,
                  borderLeft: "1px solid rgba(0, 0, 0, 0.1)"
                }}
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            </div>
          </div>
        )}

        {/* OTP Input */}
        {stage === "otp" && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: theme.text }}>
              Enter 6-digit code:
            </label>
            <div style={{
              display: "flex",
              border: "1px solid rgba(0, 0, 0, 0.18)",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.75)",
              overflow: "hidden"
            }}>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onVerify();
                  }
                }}
                maxLength={6}
                style={{
                  flex: 1,
                  padding: "10px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  outline: "none",
                  border: "none",
                  background: "transparent",
                  fontFamily: "inherit"
                }}
              />
              <button
                onClick={onVerify}
                disabled={loading || !otp.trim() || otp.length !== 6}
                style={{
                  appearance: "none",
                  border: "none",
                  background: loading || !otp.trim() || otp.length !== 6 ? "#ccc" : "linear-gradient(180deg, #ff8ec3 0%, #ff6fa5 100%)",
                  color: "#fff",
                  padding: "10px 16px",
                  cursor: loading || !otp.trim() || otp.length !== 6 ? "not-allowed" : "pointer",
                  fontWeight: "800",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  opacity: loading || !otp.trim() || otp.length !== 6 ? 0.5 : 1,
                  borderLeft: "1px solid rgba(0, 0, 0, 0.1)"
                }}
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{ 
            marginBottom: "16px", 
            padding: "8px 12px", 
            borderRadius: "6px",
            fontSize: "13px",
            backgroundColor: stage === "otp" && message.includes("New code sent") ? "#d4edda" : "#f8d7da",
            color: stage === "otp" && message.includes("New code sent") ? "#155724" : "#721c24",
            border: stage === "otp" && message.includes("New code sent") ? "1px solid #c3e6cb" : "1px solid #f5c6cb"
          }}>
            {message}
          </div>
        )}


        {/* Slack Login Button */}
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button
            onClick={handleSlackLogin}
            style={{
              appearance: "none",
              border: "2px solid #2D0B2D",
              background: "#4A154B",
              color: "white",
              borderRadius: "8px",
              padding: "10px 16px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              justifyContent: "center"
            }}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg"
              alt="Slack"
              width="16"
              height="16"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            Login with Slack
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Camp() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [token, setToken] = useState(null);

  // Check for existing token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // System theme detection
  useEffect(() => {
    const checkSystemTheme = () => {
      if (typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
      }
    };

    checkSystemTheme();

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => setIsDarkMode(e.matches);
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Theme colors
  const theme = {
    background: isDarkMode ? '#1e1f22' : 'white',
    surface: isDarkMode ? '#313338' : 'white',
    text: isDarkMode ? '#ffffff' : 'black',
    textSecondary: isDarkMode ? '#b9bbbe' : '#666666',
    border: isDarkMode ? '#40444b' : '#e0e0e0',
    accent: '#F5994B', // Keep the orange accent color
    buttonSecondary: isDarkMode ? '#313338' : 'white',
    cardBackground: isDarkMode ? '#313338' : 'white',
  };

  const requestOtp = async (email, sentby) => {
    try {
      const res = await fetch("/api/newLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sentby }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, ...data };
    } catch (e) {
      return { ok: false, message: "Network error" };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await fetch("/api/tryOTP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.token) {
        localStorage.setItem("token", data.token);
        // Redirect to campground after successful login
        window.location.href = '/campground';
      }
      return { ok: res.ok, ...data };
    } catch (e) {
      return { ok: false, message: "Network error" };
    }
  };

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // Redirect to campground after successful login
    window.location.href = '/campground';
  };

  return (
    <>
      <Head>
        <title>Camp - Shiba Arcade</title>
        <meta name="description" content="Camp page" />
      </Head>
      <div style={{ 
        backgroundColor: '#fff',
        minHeight: '100vh',
        fontSize: '16px',
        color: '#000',
        padding: '20px'
      }}>
        Hello World
        <button 
          onClick={() => {
            if (token) {
              // User is already logged in, redirect to campground
              window.location.href = '/campground';
            } else {
              // User needs to login
              setShowLoginModal(true);
            }
          }}
          style={{
            padding: "8px 16px",
            border: `1px solid ${theme.border}`,
            borderRadius: "4px",
            backgroundColor: theme.accent,
            color: "#fff",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          {token ? "Enter Campground" : "Login"}
        </button>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          requestOtp={requestOtp}
          verifyOtp={verifyOtp}
          theme={theme}
        />
      )}
    </>
  );
}

