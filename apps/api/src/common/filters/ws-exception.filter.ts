import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class PlaybackWsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const client = host.switchToWs().getClient();
      const pattern = host.switchToWs().getPattern();
      const data = host.switchToWs().getData();
      const body = exception.getResponse();
      return this.handleError(client, new WsException(body), { pattern, data });
    }
    return super.catch(exception, host);
  }
}
