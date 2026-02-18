import 'reflect-metadata';
import {
  ResponseMessage,
  RESPONSE_MESSAGE_KEY,
} from '../../src/common/decorators/response-message.decorator';

describe('ResponseMessage decorator', () => {
  it('should set the correct metadata key and value', () => {
    class TestController {
      @ResponseMessage('Test message')
      handler() {}
    }

    const descriptor = {
      value() {},
    } as PropertyDescriptor;

    const decorator = ResponseMessage('Test message');
    decorator(TestController, 'handler', descriptor);

    const metadata = Reflect.getMetadata(
      RESPONSE_MESSAGE_KEY,
      descriptor.value,
    );
    expect(metadata).toBe('Test message');
  });
});
