import { Form } from "@remix-run/react";
import { TextAreaAutoSize } from "./ui/input";
import React from "react";
import { Button } from "./ui/button";

export function QueryForm({
  textAreaName,
  apiKeyName,
  apiKeyValue,
  formId,
  formOnSubmit,
}: {
  textAreaName: string;
  apiKeyName: string;
  apiKeyValue: string;
  formId: string;
  formOnSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Form
      className="px-4 py-3 flex gap-x-4"
      method="POST"
      id={formId}
      onSubmit={formOnSubmit}
    >
      <TextAreaAutoSize name={textAreaName} />
      <input hidden name={apiKeyName} defaultValue={apiKeyValue} />
      <Button type="submit">Submit</Button>
    </Form>
  );
}
