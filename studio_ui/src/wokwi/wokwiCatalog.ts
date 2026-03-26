export {
  getWokwiBehaviorSupport,
  getWokwiModel,
  getWokwiPinLabels,
  getWokwiRuntimeDefaults,
  hasWokwiModel as hasWokwiPart,
  WOKWI_MODELS,
} from "./wokwiModels";

export type WokwiPartSpec = {
  tagName: string;
  naturalWidth: number;
  naturalHeight: number;
};

import { WOKWI_MODELS } from "./wokwiModels";

export const WOKWI_PART_SPECS: Record<string, WokwiPartSpec> = Object.freeze(
  Object.fromEntries(
    WOKWI_MODELS.map((model) => [
      model.libraryItemId,
      {
        tagName: model.wokwi.tagName,
        naturalWidth: model.wokwi.naturalSizePx.width,
        naturalHeight: model.wokwi.naturalSizePx.height,
      },
    ]),
  ),
) as Record<string, WokwiPartSpec>;
