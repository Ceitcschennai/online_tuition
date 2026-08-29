const { KnowledgeAgent, ActionAgent, AnalyticsAgent } = require("../agents/crewAgents");

// ================= ORCHESTRATION =================
const handleRequest = async (input, customerId) => {
  // Step 1: Fetch customer profile
  const profile = await KnowledgeAgent.getCustomer(customerId);
  if (!profile) {
    throw new Error(`Customer with ID ${customerId} not found`);
  }

  // Step 2: Create a support task/ticket
  const task = {
    customerId,
    issue: input,
    status: "open",
    createdAt: new Date(),
  };
  await ActionAgent.createTask(task);

  // Step 3: Log the interaction
  await AnalyticsAgent.logInteraction({
    customerId,
    message: input,
    timestamp: new Date(),
  });

  // Step 4: Return confirmation
  return `Ticket created for ${profile.name}: ${input}`;
};

module.exports = { handleRequest };