import { JSONSchemaFaker } from "json-schema-faker"
import { Args } from "@storybook/types"

const generateArgs = (schema: Record<string, any>): Args => {
  const generated = JSON.parse(JSON.stringify(JSONSchemaFaker.generate(schema)))
  return generated
}

const slotsToMarkup = (slots: Record<string, any>) =>
  Object.entries(slots).reduce((acc, [key, value]) => {
    acc[key] = { type: "string", ...value }
    return acc
  }, {})

export default (
  content: { props?: { properties?: {} }; slots?: {} },
  jsonSchemaFakerOptions: Record<string, any>
): Args => {
  JSONSchemaFaker.option({
    ignoreProperties: ["attributes"],
    pruneProperties: ["attributes"],
    failOnInvalidTypes: false,
    useExamplesValue: true,
    useDefaultValue: true,
    ...jsonSchemaFakerOptions
  })

  const generatedArgs = {
    ...(content?.props?.properties && generateArgs(content.props.properties)),
    ...(content?.slots && generateArgs(slotsToMarkup(content.slots)))
  }

  return generatedArgs
}
