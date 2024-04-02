import {
  Value,
  ValueSource,
} from '../remote-config-api';

/**
 * Implements type-safe getters for parameter values.
 * 
 * Visible for testing.
 * 
 * @internal
 */
export class ValueImpl implements Value {
  public static BOOLEAN_TRUTHY_VALUES = ['1', 'true', 't', 'yes', 'y', 'on'];
  public static DEFAULT_VALUE_FOR_NUMBER = 0;
  public static DEFAULT_VALUE_FOR_STRING = '';
  constructor(
        private readonly source: ValueSource,
        private readonly value = ValueImpl.DEFAULT_VALUE_FOR_STRING) { }
  asBoolean(): boolean {
    return ValueImpl.BOOLEAN_TRUTHY_VALUES.indexOf(this.value) >= 0;
  }
  asNumber(): number {
    const num = Number(this.value);
    if (isNaN(num)) {
      return ValueImpl.DEFAULT_VALUE_FOR_NUMBER;
    }
    return num;
  }
  asString(): string {
    return this.value;
  }
  getSource(): ValueSource {
    return this.source;
  }
}