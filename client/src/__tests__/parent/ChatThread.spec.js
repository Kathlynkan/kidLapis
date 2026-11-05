// Owner: Kat

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChatThread from '@/components/ChatThread.vue'

// fake messages so we dont need the real server, they have the same fields as the real ones
// the first one is from the parent (u_par1) and the second one is from the coordinator
const messages = [
    { id: 'm1', fromId: 'u_par1', fromName: 'Ms Grace', text: 'Hello', sentAt: '2026-10-21T12:00:00.000Z' },
    { id: 'm2', fromId: 'u_coord', fromName: 'Coordinator', text: 'Hi there', sentAt: '2026-10-21T12:30:00.000Z' },
]

// every test is the same 3 steps: mount the chat box, type or click something if we need to, then check what shows up
// wrapper = the whole chat box we just mounted
describe('ChatThread', () => {

    // Test case 1: Verify that the component displays a bubble for each message.
    it('shows a bubble for each message', () => {
        const wrapper = mount(ChatThread, {
            props: { messages, currentUserId: 'u_par1' },
        })

        // each message is one .message-row, (in css message views) we gave it 2 messages so there should be 2 rows
        expect(
            wrapper.findAll('.message-row')
        ).toHaveLength(2)
    })

    // Test case 2: Verify that my own message goes on my side and the other person's message does not.
    it('puts my message on my side of the chat', () => {
        // the one logged in is the parent (u_par1), so message 1 is the parent's and message 2 is the coordinator's
        const wrapper = mount(ChatThread, {
            props: { messages, currentUserId: 'u_par1' },
        })

        const rows = wrapper.findAll('.message-row')

        // the chat adds the class from-me (in css message views) to my own messages, thats what puts them on the parent's side
        expect(rows[0].classes('from-me')).toBe(true)
        expect(rows[1].classes('from-me')).toBe(false)
    })

    // Test case 3: Verify that the component says there are no messages yet when the chat is empty.
    it('says there are no messages yet', () => {
        // no messages this time
        const wrapper = mount(ChatThread, {
            props: { messages: [], currentUserId: 'u_par1' },
        })

        expect(wrapper.text())
            .toContain('No messages yet')
    })

    // Test case 4: Verify that pressing send emits a "send" event with the text that was typed.
    // async because typing and clicking take some time, so we have to await them
    it('emits the text when send is pressed', async () => {
        const wrapper = mount(ChatThread, {
            props: { messages: [], currentUserId: 'u_par1' },
        })

        // type in the box and press send, just like a real person would
        await wrapper.find('[data-test="chat-input"]')
            .setValue('Thank you')
        await wrapper.find('form')
            .trigger('submit')

        // the chat box doesnt send anything by itself, it just tells the page "please send this"
        // emitted('send') is what it told the page
        expect(
            wrapper.emitted('send')
        ).toBeTruthy()

        expect(
            wrapper.emitted('send')[0]
        ).toEqual(['Thank you'])
    })

    // Test case 5: Verify that an empty message is not sent.
    it('does not emit an empty message', async () => {
        const wrapper = mount(ChatThread, {
            props: { messages: [], currentUserId: 'u_par1' },
        })

        // just spaces in the box, no real words
        await wrapper.find('[data-test="chat-input"]')
            .setValue('   ')
        await wrapper.find('form')
            .trigger('submit')

        // theres nothing to send so it shouldnt tell the page anything
        expect(
            wrapper.emitted('send')
        ).toBe(undefined)
    })
})
