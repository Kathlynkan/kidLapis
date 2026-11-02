/*
Component Test for ChatThread.vue (the chat bubbles and the box to type a message)   Owner: Kat

    User behavior
        ↓
    Expected outcome
        ↓
    Test implementation

*/

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChatThread from '@/components/ChatThread.vue'

// pretend messages so we dont need the real server. same fields as the real ones
// (one from the parent u_par1, one from the teacher)
const messages = [
    { id: 'm1', fromId: 'u_par1', fromName: 'Ms Grace', text: 'Hello', sentAt: '2026-10-21T12:00:00.000Z' },
    { id: 'm2', fromId: 'u_coord', fromName: 'Teacher', text: 'Hi there', sentAt: '2026-10-21T12:30:00.000Z' },
]

// every test does the same 3 things: build the chat box with mount, do something to it if needed, then check it
// "wrapper" is the whole chat box we just built
describe('ChatThread', () => {

    // Test case (1): Verify that the component displays a bubble for each message.
    it('shows a bubble for each message', () => {
        const wrapper = mount(ChatThread, {
            props: { messages, currentUserId: 'u_par1' },
        })

        // each message is one .message-row in the component, we gave it 2 messages so we should find 2
        expect(
            wrapper.findAll('.message-row')
        ).toHaveLength(2)
    })

    // Test case (2): Verify that the component displays the words of a message.
    it('shows the words of a message', () => {
        const wrapper = mount(ChatThread, {
            props: { messages, currentUserId: 'u_par1' },
        })

        // wrapper.text() is all the words on the screen, so we check Hi there is one of them
        expect(wrapper.text())
            .toContain('Hi there')
    })

    // Test case (3): Verify that the component says there are no messages yet when the chat is empty.
    it('says there are no messages yet', () => {
        // empty list this time
        const wrapper = mount(ChatThread, {
            props: { messages: [], currentUserId: 'u_par1' },
        })

        expect(wrapper.text())
            .toContain('No messages yet')
    })

    // Test case (4): Verify that pressing send emits a "send" event with the text that was typed.
    // async because typing and clicking take a moment to show, so we await them
    it('emits the text when send is pressed', async () => {
        const wrapper = mount(ChatThread, {
            props: { messages: [], currentUserId: 'u_par1' },
        })

        // type in the box then press send, like a real user
        await wrapper.find('[data-test="chat-input"]')
            .setValue('Thank you')
        await wrapper.find('form')
            .trigger('submit')

        // the chat box doesnt send anything itself, it just tells the page "send this"
        // emitted('send') is what it told the page
        expect(
            wrapper.emitted('send')
        ).toBeTruthy()

        expect(
            wrapper.emitted('send')[0]
        ).toEqual(['Thank you'])
    })

    // Test case (5): Verify that an empty message is not sent.
    it('does not emit an empty message', async () => {
        const wrapper = mount(ChatThread, {
            props: { messages: [], currentUserId: 'u_par1' },
        })

        // only spaces in the box
        await wrapper.find('[data-test="chat-input"]')
            .setValue('   ')
        await wrapper.find('form')
            .trigger('submit')

        // nothing real to send so it shouldnt tell the page anything
        expect(
            wrapper.emitted('send')
        ).toBe(undefined)
    })
})
