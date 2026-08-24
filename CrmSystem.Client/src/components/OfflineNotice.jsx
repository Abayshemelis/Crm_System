import React from "react";

export default function OfflineNotice() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f0f4ff, #e6e9ff)",
        fontFamily: "'Inter', sans-serif",
        color: "#2d3748",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
        😕 Oops – We’re offline
      </h1>
      <p style={{ fontSize: "1rem", maxWidth: "400px" }}>
        The Ngrok tunnel that connects this device to the CRM backend is not reachable.
        Please connect the computer running the CRM API to the internet, or open the app using the local LAN address.
      </p>
      <code
        style={{
          background: "#fff",
          borderRadius: "4px",
          padding: "0.5rem 0.75rem",
          marginTop: "1rem",
          boxShadow: "0 2px 6px rgba(0,0,0,.1)"
        }}
      >
        http://YOUR-LAN-IP:5173
      </code>
    </div>
  );
}
