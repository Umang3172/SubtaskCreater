import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { REQUESTED_HEADERS } from "./constants/constants";
import extractSubtasks, {
  extractingSubtasksFromOpenAiResponse,
} from "./utils/extractSubtasks";
const resolver = new Resolver();

resolver.define("fetchLabels", async (req) => {
  const key = req.context.extension.issue.key;
  console.log("key -- " + key);

  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${key}?fields=labels`);

  console.log("res -- " + JSON.stringify(res));

  const data = await res.json();

  console.log("data -- " + JSON.stringify(data));

  const label = data.fields.labels;
  if (label == undefined) {
    console.warn(`${key}: Failed to find labels`);
    return [];
  }

  return label;
});

resolver.define("getProjectMetaData", async (req) => {
  const { project } = req.context.extension;
  console.log("Project print:" + JSON.stringify(project));

  try {
    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/project/${project.id}`, {
        headers: {
          Accept: "application/json",
        },
      });

    const data = await response.json();
    
    const subTaskId = data?.issueTypes?.find(
      (issueType) => issueType.name.toLowerCase() === "subtask"
    )?.id;
    console.log("subtask id - " + subTaskId);
    
    return subTaskId;
  } catch (error) {
    console.error("getProjectMetaData issue:" + error);
  }
});

resolver.define("getOpenaiToken", async (req) => {
  require("dotenv").config();

  try {
  } catch (error) {
    console.err(
      "GROQ_API_KEY environment variable is not provided, please add it in .env"
    );
  }
  const api_key = process.env.REACT_APP_GROQ_API_KEY;

  return api_key;
});

resolver.define("getSubTasksByOpenAi", async (req) => {
  const Groq = require("groq-sdk");
  const { apiToken, issueData } = req.payload;

  console.log("apiToken---" + JSON.stringify(apiToken));

  const groq = new Groq({
    apiKey: "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",
    dangerouslyAllowBrowser: true,
  });

  const userPrompt = `Give an array of objects in this format "[{summary:\"sub-task-title\",description:\"sub-task-description\"},...]", after breaking this Jira ticket description:"${issueData.ticketDescription}" into the meaningful possible Jira sub tasks`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      model: "llama3-8b-8192",
    });

    return chatCompletion;
  } catch (error) {
    console.error("Error fetching subtasks:", error);
    return []; // Return empty array if an error occurs
  }
});

resolver.define("getIssueDetailsById", async (req) => {
  const { issue, project } = req.context.extension;
  try {
    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${issue.id}?expand=renderedFields`, {
        headers: REQUESTED_HEADERS,
      });
    const data = await response.json();
    return {
      projectId: project.id,
      issueParentKey: issue.key,
      ticketDescription: data.renderedFields.description,
    };
  } catch (error) {
    console.error("getIssueById issue:" + error);
  }
});

resolver.define("createSubTasks", async (req) => {
  const { issue, project } = req.context.extension;
  const { res, subTaskId } = req.payload;

  console.log("subtask idddddddddddddd" + JSON.stringify(subTaskId));
  
  try {
    const formattedArray = extractingSubtasksFromOpenAiResponse(res);

    for (const element of formattedArray) {
      const requestBody = JSON.stringify({
        fields: {
          description: {
            content: [
              {
                content: [
                  {
                    text: element.description,
                    type: "text",
                  },
                ],
                type: "paragraph",
              },
            ],
            type: "doc",
            version: 1,
          },
          issuetype: {
            id: subTaskId,
          },
          parent: {
            key: issue.key,
          },
          project: {
            id: project.id,
          },
          summary: element.summary,
        },
      });

      console.log("this is subtask " + JSON.stringify(requestBody));

      try {
        const response = await api
          .asUser()
          .requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: REQUESTED_HEADERS,
            body: requestBody,
          });

        console.log(response.status); 
        console.log(await response.text());
      } catch (error) {
        console.error("cannot create" + error);
      }
    }
  } catch (error) {
    console.log(error);
  }
});

export const handler = resolver.getDefinitions();
