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

// wrapper = the whole day card, mounted
describe('ParentSocialDay', () => {

    // Test case 1: Verify that the component shows the meal that the volunteer wrote down.
    it('shows the meal', () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { meal: 'Chicken rice' } },
        })

        // wrapper.text() gives us all the words that are on the screen
        expect(wrapper.text())
            .toContain('Chicken rice')
    })

    // Test case 2: Verify that the component shows what the child did.
    it('shows what the child did', () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { activity: ['Chess'] } },
        })

        expect(wrapper.text())
            .toContain('What Ethan Did')
        expect(wrapper.text())
            .toContain('Chess')
    })

    // Test case 3: Verify that the component shows the note from the volunteer.
    it('shows the note from the volunteer', () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { volunteerName: 'Aisha Rahman', socialNotes: 'Played chess today' } },
        })

        // it only uses her first name, so Aisha and not Aisha Rahman
        expect(wrapper.text())
            .toContain('Note from Aisha')
        expect(wrapper.text())
            .toContain('Played chess today')
    })

    // Test case 4: Verify that pressing a photo opens it big.
    it('opens the big photo when a photo is pressed', async () => {
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: { photos: ['/photos/chess.jpg'] } },
        })

        // there should be 1 small photo at the start
        expect(
            wrapper.findAll('.day-photo')
        ).toHaveLength(1)

        // press it (we await because the screen needs a tiny moment to change)
        await wrapper.find('.day-photo')
            .trigger('click')

        // now the big photo should pop up
        expect(
            wrapper.find('[data-test="photo-popup"]').exists()
        ).toBeTruthy()
    })

    // Test case 5: Verify that the component says nothing extra was noted when the volunteer didnt write anything.
    it('says nothing extra was noted for an empty day', () => {
        // empty session, the volunteer didnt fill in anything
        const wrapper = mount(ParentSocialDay, {
            props: { childName: 'Ethan', session: {} },
        })

        expect(wrapper.text())
            .toContain('Nothing extra was noted')
    })
})
