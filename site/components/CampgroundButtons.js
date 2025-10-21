export default function CampgroundButtons({ theme, onCreateClick, onJoinClick }) {
  return (
    <div style={{
      display: "flex",
      gap: "16px",
      flexWrap: "wrap",
      justifyContent: "center"
    }}>
      <button
        onClick={onCreateClick}
        style={{
          padding: "12px 24px",
          border: `2px solid ${theme.accent}`,
          borderRadius: "8px",
          backgroundColor: theme.accent,
          color: "#fff",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "600",
          fontFamily: "inherit",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#e8853a";
          e.target.style.borderColor = "#e8853a";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = theme.accent;
          e.target.style.borderColor = theme.accent;
        }}
      >
        Create Campground
      </button>
      
      <button
        onClick={onJoinClick}
        style={{
          padding: "12px 24px",
          border: `2px solid ${theme.accent}`,
          borderRadius: "8px",
          backgroundColor: "transparent",
          color: theme.accent,
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "600",
          fontFamily: "inherit",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = theme.accent;
          e.target.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
          e.target.style.color = theme.accent;
        }}
      >
        Join Campground
      </button>
    </div>
  );
}




