function ResponseHandler(
  status: number,
  message: string | object,
  data?: object | null,
  success?: boolean,
) {
  return {
    status,
    message,
    data: data || null,
    success: success || (status >= 200 && status < 400),
  };
}

export default ResponseHandler;
