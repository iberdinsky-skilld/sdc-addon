import React, { type ReactNode } from 'react'
import { useOf, type Of } from '@storybook/addon-docs/blocks'

// Story ids start with the project folder name, which differs on GitHub Pages.
export const StoryLink = ({
  of,
  children,
}: {
  of: Of
  children: ReactNode
}) => {
  const { story } = useOf(of, ['story'])
  return (
    <a href={`./?path=/story/${story.id}`} target="_top">
      {children}
    </a>
  )
}
