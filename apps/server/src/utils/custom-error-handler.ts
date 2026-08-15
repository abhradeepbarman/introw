class CustomErrorHandler extends Error {
  status: number;

  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
    this.name = 'CustomErrorHandler';
    Object.setPrototypeOf(this, CustomErrorHandler.prototype);
  }

  static badRequest(message: string = 'Bad request'): CustomErrorHandler {
    return new CustomErrorHandler(400, message);
  }

  static wrongCredentials(message: string = 'Invalid credentials'): CustomErrorHandler {
    return new CustomErrorHandler(403, message);
  }

  static unAuthorized(message: string = 'Unauthorized'): CustomErrorHandler {
    return new CustomErrorHandler(401, message);
  }

  static notAllowed(message: string = 'Action not allowed'): CustomErrorHandler {
    return new CustomErrorHandler(403, message);
  }

  static paymentRequired(message: string = 'Payment required'): CustomErrorHandler {
    return new CustomErrorHandler(402, message);
  }

  static notFound(message: string = 'Resource not found'): CustomErrorHandler {
    return new CustomErrorHandler(404, message);
  }

  static alreadyExist(message: string): CustomErrorHandler {
    return new CustomErrorHandler(409, message);
  }

  static serverError(message: string = 'Internal server error'): CustomErrorHandler {
    return new CustomErrorHandler(500, message);
  }

  toJson() {
    return {
      status: this.status,
      message: this.message,
    };
  }
}

export default CustomErrorHandler;
