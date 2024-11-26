const extractSubtasksFromRes = (messageContent) => {
  const subtaskMatches = messageContent.match(/{\s*"summary":\s*"([^"]+)",\s*"description":\s*"([^"]+)"\s*}/g);

  if (subtaskMatches) {
    return subtaskMatches.map((match) => {
      const [, summary, description] = match.match(/{\s*"summary":\s*"([^"]+)",\s*"description":\s*"([^"]+)"\s*}/);
      return { summary, description };
    });
  } else {
    return []; // Or handle the case where no matches are found
  }
};
  
  module.exports = {
    extractSubtasksFromRes,
  };
  