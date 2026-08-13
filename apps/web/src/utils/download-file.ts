import axiosInstance from '@/lib/axios';

const filenameFrom = (disposition: string | null | undefined) =>
  disposition?.match(/filename="?([^";]+)"?/i)?.[1];

export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const response = await axiosInstance.get<Blob>(path, { responseType: 'blob' });

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFrom(response.headers['content-disposition']) ?? fallbackName;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
