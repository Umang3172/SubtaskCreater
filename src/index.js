import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { REQUESTED_HEADERS } from "./constants/constants";
import extractSubtasks, {
  extractSubtasksFromRes,
} from "./utils/extractSubtasks";
const crypto = require('crypto');

const secretKey = '12345678901234567890123456789012' // 32 bytes
const staticIv = Buffer.from('1234567890123456', 'utf8');

const resolver = new Resolver();

function encrypt (text) {
  const keyLength = secretKey.length;
  let encrypted = '';

  for (let i = 0; i < text.length; i++) {
    encrypted += String.fromCharCode(text.charCodeAt(i) ^ secretKey.charCodeAt(i % keyLength));
  }

  return btoa(encrypted);
};

function decrypt (encryptedData) {
 const keyLength = secretKey.length;
  const decoded = atob(encryptedData); 
  let decrypted = '';

  for (let i = 0; i < decoded.length; i++) {

    decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ secretKey.charCodeAt(i % keyLength));
  }

  return decrypted;
};

resolver.define("fetchLabels", async (req) => {
  const key = req.context.extension.issue.key;

  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${key}?fields=labels`);

  const data = await res.json();


  const label = data.fields.labels;
  if (label == undefined) {
    console.warn(`${key}: Failed to find labels`);
    return [];
  }

  return label;
});

resolver.define("getProjectMetaData", async (req) => {
  const { project } = req.context.extension;

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
    
    return subTaskId;
  } catch (error) {
    console.error("getProjectMetaData issue:" + error);
  }
});

resolver.define("getSubTasks", async (req) => {
  const Groq = require("groq-sdk");
  const { issueData } = req.payload;

  const url = 'https://groq-jira-connector-main-6fa4f2a.d2.zuplo.dev/getSubTasks';
    
  const body = {
    ticketDescription: `${encrypt(issueData.ticketDescription)}`
  };    

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  if (response.ok) {
    const jsonResponse = await response.json();

    
    return jsonResponse
  } else {
    console.error(`Error: ${response.status} - ${response.statusText}`);
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
  
  try {
    const formattedArray = extractSubtasksFromRes(res);

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

      try {
        const response = await api
          .asUser()
          .requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: REQUESTED_HEADERS,
            body: requestBody,
          });
      } catch (error) {
        console.error("cannot create" + error);
      }
    }
  } catch (error) {
    console.log(error);
  }
});

export const handler = resolver.getDefinitions();
