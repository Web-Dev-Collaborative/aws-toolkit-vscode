/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ec2MetadataClient, IamInfo, InstanceIdentity } from './ec2MetadataClient'
import { MetadataService } from 'aws-sdk'

export class DefaultEc2MetadataClient implements Ec2MetadataClient {
    private static readonly METADATA_SERVICE_TIMEOUT: number = 500

    public constructor(private metadata: MetadataService = DefaultEc2MetadataClient.getMetadataService()) {}

    getInstanceIdentity(): Promise<InstanceIdentity> {
        return this.invoke<InstanceIdentity>('/latest/dynamic/instance-identity/document')
    }

    getIamInfo(): Promise<IamInfo> {
        return this.invoke<IamInfo>('/latest/meta-data/iam/info')
    }

    private invoke<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            this.metadata.request(path, (err, response) => {
                if (err) {
                    reject(err)
                }
                const jsonResponse: T = JSON.parse(response)
                resolve(jsonResponse)
            })
        })
    }

    private static getMetadataService() {
        return new MetadataService({
            httpOptions: {
                timeout: DefaultEc2MetadataClient.METADATA_SERVICE_TIMEOUT,
                connectTimeout: DefaultEc2MetadataClient.METADATA_SERVICE_TIMEOUT,
            } as any,
            // workaround for known bug: https://github.com/aws/aws-sdk-js/issues/3029
        })
    }
}
