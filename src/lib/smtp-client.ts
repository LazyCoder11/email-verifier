/* eslint-disable @typescript-eslint/no-unused-vars */
import { createConnection, type Socket } from "net";

export interface SMTPResponse {
  code: number;
  text: string;
}

export interface SMTPVerificationResult {
  success: boolean;
  response?: SMTPResponse;
  error?: string;
}

export class SMTPClient {
  private socket: Socket | null = null;
  private timeout: number;
  private fromEmail: string;

  constructor(timeout = 8000, fromEmail = "no-reply@example.com") {
    this.timeout = timeout;
    this.fromEmail = fromEmail;
  }

  private async sendCommand(command: string): Promise<SMTPResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("No socket connection"));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error("Command timeout"));
      }, this.timeout);

      const onData = (data: Buffer) => {
        clearTimeout(timer);
        this.socket?.off("data", onData);

        const response = data.toString().trim();
        const code = Number.parseInt(response.substring(0, 3));
        const text = response.substring(4);

        resolve({ code, text });
      };

      this.socket.on("data", onData);
      this.socket.write(command + "\r\n");
    });
  }

  private async connect(host: string, port = 25): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = createConnection({ host, port, timeout: this.timeout });

      const timer = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error("Connection timeout"));
      }, this.timeout);

      this.socket.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });

      this.socket.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      // Wait for initial greeting
      this.socket.on("data", (data) => {
        const response = data.toString().trim();
        const code = Number.parseInt(response.substring(0, 3));
        if (code >= 200 && code < 300) {
          resolve();
        } else {
          reject(new Error(`SMTP greeting failed: ${response}`));
        }
      });
    });
  }

  private disconnect(): void {
    if (this.socket) {
      try {
        this.socket.write("QUIT\r\n");
      } catch (error) {
        // Ignore errors when quitting
      }
      this.socket.destroy();
      this.socket = null;
    }
  }

  async verifyEmail(
    email: string,
    mxHost: string
  ): Promise<SMTPVerificationResult> {
    try {
      await this.connect(mxHost);

      // HELO command
      const heloResponse = await this.sendCommand(`HELO ${mxHost}`);
      if (heloResponse.code >= 400) {
        throw new Error(`HELO failed: ${heloResponse.text}`);
      }

      // MAIL FROM command
      const mailFromResponse = await this.sendCommand(
        `MAIL FROM:<${this.fromEmail}>`
      );
      if (mailFromResponse.code >= 400) {
        throw new Error(`MAIL FROM failed: ${mailFromResponse.text}`);
      }

      // RCPT TO command - this is the actual verification
      const rcptToResponse = await this.sendCommand(`RCPT TO:<${email}>`);

      this.disconnect();

      if (rcptToResponse.code >= 200 && rcptToResponse.code < 300) {
        return { success: true, response: rcptToResponse };
      } else if (rcptToResponse.code >= 500 && rcptToResponse.code < 600) {
        return { success: false, response: rcptToResponse };
      } else {
        // 4xx codes are temporary failures, treat as unknown
        return {
          success: false,
          response: rcptToResponse,
          error: "Temporary failure or greylisting",
        };
      }
    } catch (error) {
      this.disconnect();
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown SMTP error",
      };
    }
  }
}
