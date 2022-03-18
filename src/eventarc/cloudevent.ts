
/**
 * A CloudEvent version.
 */
export type CloudEventVersion = '1.0';

/**
  * A CloudEvent describes event data.
  * 
  * @see https://github.com/cloudevents/spec/blob/v1.0/spec.md
  */
export interface CloudEvent {
   id?: string;
   source?: string;
   specversion?: CloudEventVersion;
   type: string;
 
   subject?: string;
   datacontenttype?: string;
   time?: string;
   data?: object | string;
 
   // Custom attributes/extensions.
   [key: string]: unknown;
 }
