/** Mock/stub integration surface for uploads, LLMs, email, and files. */
export const Core = {
  /**
   * Mock upload: returns data URL when File provided, otherwise a mock URL.
   */
  UploadFile: async ({ file } = {}) => {
    if (file && file instanceof File) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ file_url: reader.result });
        reader.readAsDataURL(file);
      });
    }
    return { file_url: 'http://localhost/mock-file' };
  },
  /** Stub LLM invocation. */
  InvokeLLM: async () => ({}),
  /** Stub email sender. */
  SendEmail: async () => ({}),
  /** Stub image generation. */
  GenerateImage: async () => ({ url: 'http://localhost/mock-image' }),
  /** Stub file data extraction. */
  ExtractDataFromUploadedFile: async () => ({}),
  /** Stub signed URL generator. */
  CreateFileSignedUrl: async () => ({ url: 'http://localhost/mock-signed-url' }),
  /** Mock private upload target. */
  UploadPrivateFile: async ({ file } = {}) => ({ file_url: 'http://localhost/mock-private' })
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;






