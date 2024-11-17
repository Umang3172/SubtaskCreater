import React, { useEffect, useState } from 'react';
import { events, invoke, view } from '@forge/bridge';
import FlagError from "./FlagError";
import { LoadingButton, ButtonGroup } from "@forge/react";

function App() {
  const [openAiError, setOpenAiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const createSubTasksHandler = async () => {
    setIsLoading(true);

    const subTaskId = await invoke("getProjectMetaData");
    const issueData = await invoke("getIssueDetailsById");
    const label = await invoke('fetchLabels');

    console.log("subtask id "+ JSON.stringify(subTaskId) + "\n issuedata " + JSON.stringify(issueData));
    console.log("label "+ label);
    

    if (issueData.ticketDescription.length < 10) {
      setOpenAiError(
        "Please provide a meaningful description for your jira issue."
      );
      setIsLoading(false);
    } else {
      const apiToken = await invoke("getOpenaiToken");
      console.log("apiTokensudo;vusovu" + apiToken);
      
      const openAiResponse = await invoke("getSubTasksByOpenAi", {
        issueData,
        apiToken,
      });
      console.log( "\n response" + openAiResponse);
      
      const res = openAiResponse.choices[0].message.content;
      await invoke("createSubTasks", { res, subTaskId });
      view.refresh();
      setIsLoading(false);
    }
  };

  return (
    
    <div>      
      <div style={{ marginBottom: "10px" }}>
        {openAiError && <FlagError errormsg={openAiError} />}
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