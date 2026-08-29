import * as ftp from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';

export interface FtpConnectionOptions {
  host: string;
  port?: number;
  protocol?: 'ftp' | 'ftps' | 'sftp';
  username: string;
  password?: string;
  remoteDir?: string;
}

export interface FtpUploadOptions extends FtpConnectionOptions {
  localFilePath: string;
  filename: string;
}

/**
 * Test connectivity and authentication for FTP, FTPS, or SFTP server.
 */
export async function testFtpConnection(options: FtpConnectionOptions): Promise<{ success: boolean; message?: string; error?: string }> {
  const protocol = options.protocol || 'ftp';
  const port = options.port || (protocol === 'sftp' ? 22 : 21);

  if (protocol === 'sftp') {
    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: options.host,
        port: port,
        username: options.username,
        password: options.password,
        readyTimeout: 15000,
        retries: 1
      });

      // Try listing root / remote dir to verify access permissions
      const dirToList = options.remoteDir && options.remoteDir !== '/' ? options.remoteDir : '/';
      try {
        await sftp.list(dirToList);
      } catch (listErr) {
        // Some stock agencies do not allow listing, but authentication succeeded
      }

      await sftp.end();
      return { success: true, message: `Successfully connected to SFTP ${options.host}:${port}` };
    } catch (err: any) {
      try { await sftp.end(); } catch (e) {}
      return { success: false, error: err.message || 'SFTP connection failed' };
    }
  } else {
    // FTP or FTPS
    const client = new ftp.Client(15000); // 15s timeout
    client.ftp.verbose = false;

    try {
      await client.access({
        host: options.host,
        port: port,
        user: options.username,
        password: options.password,
        secure: protocol === 'ftps' ? 'implicit' : false,
        secureOptions: { rejectUnauthorized: false }
      });

      // Try listing to verify permission
      try {
        await client.list();
      } catch (listErr) {
        // Some agencies restrict LIST, but connection was authenticated
      }

      client.close();
      return { success: true, message: `Successfully connected to FTP ${options.host}:${port}` };
    } catch (err: any) {
      client.close();
      return { success: false, error: err.message || 'FTP connection failed' };
    }
  }
}

/**
 * Upload a local file to remote FTP, FTPS, or SFTP server.
 */
export async function uploadToFtp(options: FtpUploadOptions): Promise<{ success: boolean; message?: string; error?: string }> {
  const protocol = options.protocol || 'ftp';
  const port = options.port || (protocol === 'sftp' ? 22 : 21);
  const remoteFolder = options.remoteDir && options.remoteDir !== '/' ? options.remoteDir : '';
  const remotePath = remoteFolder ? `${remoteFolder.replace(/\/$/, '')}/${options.filename}` : options.filename;

  if (!fs.existsSync(options.localFilePath)) {
    return { success: false, error: 'Local file does not exist.' };
  }

  if (protocol === 'sftp') {
    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: options.host,
        port: port,
        username: options.username,
        password: options.password,
        readyTimeout: 30000,
        retries: 2
      });

      await sftp.fastPut(options.localFilePath, remotePath);
      await sftp.end();
      return { success: true, message: `Uploaded ${options.filename} to SFTP server` };
    } catch (err: any) {
      try { await sftp.end(); } catch (e) {}
      return { success: false, error: err.message || 'SFTP upload failed' };
    }
  } else {
    // FTP or FTPS
    const client = new ftp.Client(30000);
    client.ftp.verbose = false;

    try {
      await client.access({
        host: options.host,
        port: port,
        user: options.username,
        password: options.password,
        secure: protocol === 'ftps' ? 'implicit' : false,
        secureOptions: { rejectUnauthorized: false }
      });

      await client.uploadFrom(options.localFilePath, remotePath);
      client.close();
      return { success: true, message: `Uploaded ${options.filename} to FTP server` };
    } catch (err: any) {
      client.close();
      return { success: false, error: err.message || 'FTP upload failed' };
    }
  }
}
