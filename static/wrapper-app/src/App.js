import React, { useState } from "react";
import { invoke, view } from "@forge/bridge";
import "@atlaskit/css-reset";

function App() {
  const [lengthError, setIssueLengthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const createSubTasksHandler = async () => {
    setIsLoading(true);
    setIssueLengthError(null);

    try {
      const subTaskId = await invoke("getProjectMetaData");
      const issueData = await invoke("getIssueDetailsById");

      if (!issueData || !issueData.ticketDescription) {
        throw new Error("Invalid issue data received.");
      }

      const response = await invoke("getSubTasks", { issueData });

      if (
        !response ||
        !response.choices ||
        !response.choices[0]?.message?.content
      ) {
        throw new Error("Invalid response from getSubTasks.");
      }

      const res = response.choices[0].message.content;
      await invoke("createSubTasks", { res, subTaskId });
      view.refresh();
    } catch (error) {
      console.error("Error creating sub-tasks:", error);
      setIssueLengthError(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <button
        style={{
          backgroundColor: "#0052CC",
          color: "#FFFFFF",
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "0",
        }}
        onClick={createSubTasksHandler}
        disabled={isLoading}
      >
        {isLoading ? (
          <div
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid #ffffff",
              borderTop: "2px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        ) : (
          "Generate Sub-tasks"
        )}
      </button>

      {lengthError && <p style={{ color: "red", marginTop: "10px" }}>{lengthError}</p>}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

export default App;
