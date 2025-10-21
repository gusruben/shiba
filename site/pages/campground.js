import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import CreateCampgroundForm from "@/components/CreateCampgroundForm";
import CampgroundButtons from "@/components/CampgroundButtons";

export default function Campground() {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slackProfile, setSlackProfile] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("My Campground");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [noCampYet, setNoCampYet] = useState(true);
  const [campData, setCampData] = useState(null);
  const [isLoadingCampground, setIsLoadingCampground] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const profileDropdownRef = useRef(null);

  // Check for existing token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        setIsLoading(false);
      } else {
        // No token, redirect to camp immediately
        window.location.href = '/camp';
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

  // Fetch Slack profile and campground when user has token
  useEffect(() => {
    if (!token) {
      setSlackProfile(null);
      return;
    }

    let cancelled = false;
    
    const fetchSlackProfile = async () => {
      try {
        const res = await fetch('/api/getMySlackProfile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.slackId) {
          setSlackProfile({
            displayName: data.displayName || '',
            image: data.image || '',
            slackId: data.slackId || ''
          });
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to fetch Slack profile:', e);
          setSlackProfile(null);
        }
      }
    };

    const fetchMyCampground = async () => {
      try {
        const res = await fetch('/api/getMyCampground', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.ok) {
          if (data.camp) {
            // User has a campground, unlock tabs and store camp data
            setCampData(data.camp);
            setNoCampYet(false);
          } else {
            // User has no campground
            setCampData(null);
            setNoCampYet(true);
          }
          setIsLoadingCampground(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to fetch campground:', e);
          setIsLoadingCampground(false);
        }
      }
    };
    
    fetchSlackProfile();
    fetchMyCampground();
    
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

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

  // Don't render anything if loading or redirecting
  if (isLoading || !token) {
    return null;
  }

  const tabs = ["My Campground", "Teammates", "Progress", "Supplies", "Timeline"];

  const handleCreateCampground = async (name) => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/CreateCamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        console.log("Campground created:", data.camp);
        setIsCreating(false);
        setShowSuccess(true);
        setCampData(data.camp);
        setIsLoadingCampground(false);
        
        // Show success message for 2 seconds, then close form and unlock tabs
        setTimeout(() => {
          setShowSuccess(false);
          setShowCreateForm(false);
          setNoCampYet(false);
        }, 2000);
      } else {
        setIsCreating(false);
        alert(data.message || 'Failed to create campground');
      }
    } catch (error) {
      setIsCreating(false);
      console.error('Error creating campground:', error);
      alert('Failed to create campground. Please try again.');
    }
  };

  const handleJoinCampground = () => {
    // TODO: Handle join campground
    console.log("Join Campground clicked");
  };

  return (
    <>
      <Head>
        <title>Campground - Shiba Arcade</title>
        <meta name="description" content="Campground page" />
      </Head>
      <div style={{ 
        backgroundColor: theme.background,
        minHeight: '100vh',
        fontSize: '16px',
        color: theme.text,
      }}>
        {/* Top Bar */}
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: theme.surface,
          padding: "16px 20px"
        }}>
          <div style={{width: "100%", display: "flex"}}>
            <div style={{display: "flex", flexDirection: "row", alignItems: "center", width: "100%"}}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <img 
                  src="/SpeedyShibaShipper.png" 
                  alt="Speedy Shiba Shipper" 
                  style={{ width: "32px", height: "32px", verticalAlign: "middle" }}
                />
                <h1
                  style={{
                    color: theme.text,
                    fontSize: "24px",
                    fontWeight: "bold",
                    margin: 0,
                    whiteSpace: "nowrap",
                    lineHeight: "32px",
                    paddingTop: 4,
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  Shiba Campground
                </h1>
              </div>
              <div style={{ flex: 1 }}></div>
              <div style={{display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", flexShrink: 0}}>
                {/* Profile Picture with Dropdown */}
                {token && (
                  <div 
                    ref={profileDropdownRef}
                    style={{ position: "relative" }}
                  >
                    <div
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        border: "1px solid #000",
                        backgroundColor: slackProfile?.image ? theme.surface : "#f0f0f0",
                        backgroundImage: slackProfile?.image ? `url(${slackProfile.image})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      {slackProfile?.image ? (
                        <img
                          src={slackProfile.image}
                          alt={slackProfile.displayName || "Profile"}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3, border: "1px solid #000" }}
                        />
                      ) : (
                        <div style={{ 
                          width: "100%", 
                          height: "100%", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          fontSize: "12px",
                          color: "#666"
                        }}>
                          ?
                        </div>
                      )}
                    </div>
                    
                    {/* Dropdown Menu */}
                    {showProfileDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "40px",
                          right: 0,
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          minWidth: "200px",
                          zIndex: 1000,
                          overflow: "hidden"
                        }}
                      >
                        <button
                          onClick={() => {
                            // Clear token and redirect to camp
                            localStorage.removeItem('token');
                            setToken(null);
                            router.push('/camp');
                          }}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: theme.text,
                            fontSize: "14px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = isDarkMode ? "#40444b" : "#f5f5f5";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                          }}
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          position: "fixed",
          top: "64px", // Reduced from 80px to decrease spacing
          left: 0,
          right: 0,
          zIndex: 9,
          backgroundColor: theme.surface,
          padding: "8px 20px 16px 20px", // Increased bottom padding for more spacing
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{width: "100%", display: "flex"}}>
            <div style={{display: "flex", flexDirection: "row", alignItems: "center", gap: "32px"}}>
              {tabs.map((tab) => {
                const isLocked = noCampYet && tab !== "My Campground";
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      if (!isLocked) {
                        setActiveTab(tab);
                      }
                    }}
                    style={{
                      background: isLocked ? "#f5f5f5" : "none",
                      border: isLocked ? "1px solid #ccc" : "none",
                      color: isLocked ? theme.textSecondary : (activeTab === tab ? theme.accent : theme.text),
                      fontSize: "16px",
                      margin: 0,
                      textAlign: "left",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      fontWeight: activeTab === tab ? "bold" : "normal",
                      textDecoration: activeTab === tab ? "underline" : "none",
                      textUnderlineOffset: "4px",
                      padding: isLocked ? "4px 8px" : "4px 0",
                      borderRadius: isLocked ? "6px" : "0",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: isLocked ? 0.7 : 1
                    }}
                    title={isLocked ? "Create or join a campground first" : ""}
                  >
                    {isLocked && (
                      <img 
                        src="/locked.svg" 
                        alt="Locked" 
                        style={{ width: "14px", height: "14px" }}
                      />
                    )}
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ 
          paddingTop: "128px", // Adjusted for increased bottom padding of navigation
          paddingLeft: "20px",
          paddingRight: "20px",
          height: "calc(100vh - 128px)", // Full height minus the header space
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            maxWidth: "600px"
          }}>
              {isLoadingCampground ? (
                <p style={{
                  fontSize: "18px",
                  color: theme.text,
                  textAlign: "center",
                  margin: 0,
                  opacity: 0.3
                }}>
                  Loading...
                </p>
              ) : !noCampYet && campData ? (
                <p style={{
                  fontSize: "18px",
                  color: theme.text,
                  textAlign: "center",
                  margin: 0
                }}>
                  You're a part of: <strong>{campData.name}</strong>
                </p>
              ) : showCreateForm ? (
                <CreateCampgroundForm 
                  theme={theme}
                  onCreate={handleCreateCampground}
                  onCancel={() => setShowCreateForm(false)}
                  isLoading={isCreating}
                  showSuccess={showSuccess}
                />
              ) : (
                <React.Fragment>
                  <p style={{
                    fontSize: "18px",
                    color: theme.text,
                    textAlign: "center",
                    margin: 0
                  }}>
                    You currently have no campground, would you like to<br />create one or join one?
                  </p>
                  <CampgroundButtons 
                    theme={theme}
                    onCreateClick={() => setShowCreateForm(true)}
                    onJoinClick={handleJoinCampground}
                  />
                </React.Fragment>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
