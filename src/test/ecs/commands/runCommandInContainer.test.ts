/*!
 * Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as assert from 'assert'
import * as picker from '../../../shared/ui/picker'
import * as sinon from 'sinon'
import { runCommandInContainer } from '../../../ecs/commands/runCommandInContainer'
import { EcsContainerNode } from '../../../ecs/explorer/ecsContainerNode'
import { DefaultEcsClient, EcsClient } from '../../../shared/clients/ecsClient'
import { ChildProcess } from '../../../shared/utilities/childProcess'
import { FakeWindow } from '../../shared/vscode/fakeWindow'
import { FakeChildProcessResult } from '../../shared/sam/cli/testSamCliProcessInvoker'

describe('runCommandInContainer', function () {
    let sandbox: sinon.SinonSandbox
    const taskListOne = ['onlyTask']
    const taskListTwo = ['taskId1', 'taskId2']
    const chosenTask = [{ label: 'taskId1' }]
    const containerName = 'containerName'
    const serviceName = 'serviceName'
    const clusterArn = 'arn:fake:cluster'

    const hasSSMPluginChildProcessResult: FakeChildProcessResult = {
        stdout: 'The Session Manager plugin was installed successfully',
        error: undefined,
        exitCode: 0,
        stderr: '',
    }

    const doesNotHaveSSMPluginChildProcessResult: FakeChildProcessResult = {
        stdout: 'Cannot find text here',
        error: undefined,
        exitCode: 254,
        stderr: 'This is not installed',
    }

    const successfulExecResult: FakeChildProcessResult = new FakeChildProcessResult({})

    let ecs: EcsClient = new DefaultEcsClient('fakeRegion')
    let node: EcsContainerNode

    beforeEach(function () {
        sandbox = sinon.createSandbox()
        node = new EcsContainerNode(containerName, serviceName, clusterArn, ecs)
    })

    afterEach(function () {
        sandbox.restore()
    })

    it('prompts for command', async function () {
        const childCalls = sandbox
            .stub(ChildProcess.prototype, 'run')
            .onFirstCall()
            .resolves(hasSSMPluginChildProcessResult)
        childCalls.onSecondCall().resolves(successfulExecResult)
        sandbox.stub(ecs, 'listTasks').resolves(taskListTwo)
        sandbox.stub(picker, 'promptUser').resolves(chosenTask)

        const window = new FakeWindow({ inputBox: { input: 'ls' } })
        await runCommandInContainer(node, window)

        assert.strictEqual(childCalls.callCount, 2)
        assert.strictEqual(window.inputBox.options?.prompt, 'Enter the command to run in container')
    })

    it('does not show picker if only one task exists', async function () {
        const childCalls = sandbox
            .stub(ChildProcess.prototype, 'run')
            .onFirstCall()
            .resolves(hasSSMPluginChildProcessResult)
        childCalls.onSecondCall().resolves(successfulExecResult)
        sandbox.stub(ecs, 'listTasks').resolves(taskListOne)
        const pickerStub = sandbox.stub(picker, 'promptUser')

        const window = new FakeWindow({ inputBox: { input: 'ls' } })
        await runCommandInContainer(node, window)

        assert.strictEqual(pickerStub.notCalled, true)
    })

    it('throws error if SSM plugin not installed', async function () {
        const childCalls = sandbox
            .stub(ChildProcess.prototype, 'run')
            .onFirstCall()
            .resolves(doesNotHaveSSMPluginChildProcessResult)
        childCalls.onSecondCall().resolves(successfulExecResult)
        const listTasksStub = sandbox.stub(ecs, 'listTasks').resolves(taskListTwo)
        const pickerStub = sandbox.stub(picker, 'promptUser')

        const window = new FakeWindow({ inputBox: { input: 'ls' } })
        try {
            await runCommandInContainer(node, window)
        } catch (error) {
            assert.ok(error)
            assert.strictEqual(String(error), 'Error: The Session Manager plugin for the AWS CLI is not installed.')
        }

        assert.strictEqual(childCalls.callCount, 1)
        assert.strictEqual(listTasksStub.notCalled, true)
        assert.strictEqual(pickerStub.notCalled, true)
    })
})