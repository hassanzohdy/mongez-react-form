import events from "@mongez/events";
import { FormEventType, FormInterface } from "../types";

export default class FormEvents {
  /**
   * Form event prefix
   */
  protected formEventPrefix: string;
  /**
   * Constructor
   */
  public constructor(protected form: FormInterface) {
    this.formEventPrefix = `form.${form.id}`;
  }

  /**
   * Listen to loading event
   */
  public loading(callback: (loadingReason: string) => void) {
    return this.on("loading", callback);
  }

  /**
   * Form events method
   */
  public on(event: FormEventType, callback: any) {
    return events.subscribe(`${this.formEventPrefix}.${event}`, callback);
  }

  /**
   * Trigger form events
   */
  public trigger(event: FormEventType, ...values: any[]) {
    return events.trigger(`${this.formEventPrefix}.${event}`, ...values);
  }

  /**
   * Trigger all event subscriptions for the given event
   */
  public triggerAll(event: FormEventType, ...values: any[]) {
    return events.triggerAll(`${this.formEventPrefix}.${event}`, ...values);
  }
}
