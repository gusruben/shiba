export default function ToggleComponent({ 
  textOff, 
  textOn, 
  isOn, 
  setState
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      border: '1px solid #aaa',
      borderRadius: '6px',
      padding: '2px',
    //   background: '#fff'
    }}>
      <button
        type="button"
        onClick={() => {
          setState(false);
        }}
        style={{
          padding: '4px 10px',
          fontSize: '10px',
          fontWeight: !isOn ? '600' : '400',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          background: !isOn ? 'linear-gradient(180deg, #ff8ec3 0%, #ff6fa5 100%)' : 'transparent',
          color: !isOn ? '#fff' : '#aaa'
        }}
      >
        {textOff}
      </button>
      <button
        type="button"
        onClick={() => {
          setState(true);
        }}
        style={{
          padding: '4px 10px',
          fontSize: '10px',
          fontWeight: isOn ? '600' : '400',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          background: isOn ? 'linear-gradient(180deg, #ff8ec3 0%, #ff6fa5 100%)' : 'transparent',
          color: isOn ? '#fff' : '#aaa'
        }}
      >
        {textOn}
      </button>
    </div>
  );
}
