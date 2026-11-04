/*
Component Test for ParentSocialDay.vue (one day on the parent's Social tab)   Owner: Kat

    User behavior
        ↓
    Expected outcome
        ↓
    Test implementation

*/

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ParentSocialDay from '@/components/ParentSocialDay.vue'

// same idea as the chat test: build the day card with mount, give it a pretend session, then check the screen
// wrapper is the whole day card
describe('ParentSocialDay', () => {

    // Test case (1): Verify that the component displays the meal that the volunteer wrote down.
    it('shows the meal', () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { meal: 'Chicken rice' } },
        })

        // wrapper.text() = all the words on the screen
        expect(wrapper.text())
            .toContain('Chicken rice')
    })

    // Test case (2): Verify that the component displays what the child did.
    it('shows what the child did', () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { activity: ['Chess'] } },
        })

        expect(wrapper.text())
            .toContain('What Ethan Did')
        expect(wrapper.text())
            .toContain('Chess')
    })

    // Test case (3): Verify that the component displays the note from the volunteer.
    it('shows the note from the volunteer', () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { volunteerName: 'Aisha Rahman', socialNotes: 'Played chess today' } },
        })

        // it only uses her first name, Aisha
        expect(wrapper.text())
            .toContain('Note from Aisha')
        expect(wrapper.text())
            .toContain('Played chess today')
    })

    // Test case (4): Verify that pressing a photo opens the big photo.
    it('opens the big photo when a photo is pressed', async () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { photos: ['/photos/chess.jpg'] } },
        })

        // 1 small photo at the start
        expect(
            wrapper.findAll('.day-photo')
        ).toHaveLength(1)

        // press it (await because the screen needs a moment to change)
        await wrapper.find('.day-photo')
            .trigger('click')

        // now the big photo should be there
        expect(
            wrapper.find('[data-test="photo-popup"]').exists()
        ).toBeTruthy()
    })

    // Test case (5): Verify that the component says nothing extra was noted when the volunteer wrote nothing.
    it('says nothing extra was noted for an empty day', () => {
        // empty session, the volunteer filled nothing in
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: {} },
        })

        expect(wrapper.text())
            .toContain('Nothing extra was noted')
    })
})
