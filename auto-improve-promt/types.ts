// types.ts
export type Example = {
  id: string;
  input: { userText: string };
  // The spec we need the model to obey (for the judge to check):
  spec: {
    mustReturnJson: boolean;
    mustHaveSteps: boolean; // when intent is actionable
  };
};

export type LLM = (args: { system: string; input: any }) => Promise<string>;
