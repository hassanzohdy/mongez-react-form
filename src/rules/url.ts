import { trans } from "@mongez/localization";
import { isUrl } from "@mongez/supportive-is";
import { type InputRule } from "../types";

export const urlRule: InputRule = {
  name: "url",
  requiresType: "url",
  validate: ({ value }) => {
    if (!isUrl(value)) {
      return trans("validation.url");
    }
  },
};
