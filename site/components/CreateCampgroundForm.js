import { useState } from "react";

export default function CreateCampgroundForm({ theme, onCreate, onCancel, isLoading, showSuccess }) {
  const [campgroundName, setCampgroundName] = useState("");

  const handleCreate = () => {
    if (campgroundName.trim()) {
      onCreate(campgroundName.trim());
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
      maxWidth: "400px"
    }}>
      <label style={{ 
        display: "block", 
        fontSize: "16px", 
        fontWeight: "600", 
        color: theme.text,
        textAlign: "center"
      }}>
        What is the name of your campground?
      </label>
      
      <div style={{
        display: "flex",
        border: "1px solid rgba(0, 0, 0, 0.18)",
        borderRadius: "10px",
        background: "rgba(255, 255, 255, 0.75)",
        overflow: "hidden",
        width: "100%"
      }}>
        <input
          type="text"
          value={campgroundName}
          onChange={(e) => setCampgroundName(e.target.value)}
          placeholder="Enter campground name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreate();
            }
          }}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "16px",
            boxSizing: "border-box",
            outline: "none",
            border: "none",
            background: "transparent",
            fontFamily: "inherit"
          }}
          autoFocus
        />
        <button
          onClick={handleCreate}
          disabled={!campgroundName.trim() || isLoading || showSuccess}
          style={{
            appearance: "none",
            border: "none",
            background: showSuccess 
              ? "#22c55e" 
              : (!campgroundName.trim() || isLoading) 
                ? "#ccc" 
                : "linear-gradient(180deg, #ff8ec3 0%, #ff6fa5 100%)",
            color: "#fff",
            padding: "12px 16px",
            cursor: (!campgroundName.trim() || isLoading || showSuccess) ? "not-allowed" : "pointer",
            fontWeight: "800",
            fontSize: "14px",
            fontFamily: "inherit",
            opacity: (!campgroundName.trim() || isLoading) && !showSuccess ? 0.5 : 1,
            borderLeft: "1px solid rgba(0, 0, 0, 0.1)"
          }}
        >
          {showSuccess ? "Wahooo" : isLoading ? "Creating..." : "Create"}
        </button>
      </div>
      
      <button
        onClick={onCancel}
        style={{
          background: "none",
          border: "none",
          color: theme.textSecondary,
          cursor: "pointer",
          fontSize: "14px",
          textDecoration: "underline"
        }}
      >
        Cancel
      </button>
    </div>
  );
}

