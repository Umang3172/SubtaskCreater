import React, { useEffect, useState } from 'react';
import { events, invoke, view } from '@forge/bridge';
import FlagError from "./FlagError";
import { LoadingButton, ButtonGroup } from "@forge/react";

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

      if (issueData.ticketDescription.length < 10) {
        setIssueLengthError(
          "Please provide a meaningful description for your Jira issue."
        );
      } else {
        const response = await invoke("getSubTasks", { issueData });

        if (!response || !response.choices || !response.choices[0]?.message?.content) {
          throw new Error("Invalid response from getSubTasks.");
        }

        const res = response.choices[0].message.content;
        await invoke("createSubTasks", { res, subTaskId });
        view.refresh();
      }
    } catch (error) {
      console.error("Error creating sub-tasks:", error);
      setIssueLengthError(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        {lengthError && <FlagError errormsg={lengthError} />}
      </div>

      <ButtonGroup>
        <LoadingButton
          isLoading={isLoading}
          appearance="primary"
          onClick={createSubTasksHandler}
        >
          Generate Sub-tasks
        </LoadingButton>
      </ButtonGroup>
    </div>
  );
}

export default App;
