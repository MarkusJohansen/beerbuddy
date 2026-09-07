# Requirements

## Functional Requirements

> Search option, e.g., with a dialog/form/search field for inputting search terms

Yes we have implemented search in main page where you can search for beers by name.

> List-based presentation of search results with support for handling large result sets, either by paging or dynamically loading more results through scrolling

We are using lazy loading to dynamically load more beers when you scroll down the page. This is presented in a list based presentation and supports handling large result sets.

> Ability to view more details about each object in the search results

We have implemented a feature where a person can click on a beer and then get redirected to a page where they can see more details about the beer.

> Option for sorting and filtering the result set (note that sorting and filtering should be performed on the entire result set and not just what is currently loaded on the client)

Yes, we have implemented both sorting and filtering that search through the entire result set by sending a request to the backend that sends SQL-queries to the database.

> There should be some form of user-generated data that is stored persistently on the database server and presented to the user (e.g., user adding information, reviews, ratings, search history, shopping list)

This project saves the users, users votes and comments on the database server. 

> The solution should demonstrate aspects of universal design / web accessibility

Yes we have that is shown in the [accessibility documentation](./accessibility.md).

> The solution should demonstrate aspects of sustainable web development (through design choices)

Yes we have that is shown in the [sustainability documentation](./sustainability.md).

> Good design, sensible choices, and solutions that harmonize with the type of data chosen

Yes we have chosen a dataset of beer and have made a website that is easy to use and understand and matches the type of data chosen and its purpose. Where a user can search for beers, vote on them and comment on them.

> The database and backend for the project should be hosted on the group's virtual machine upon submission.

Yes we have a backend and database hosted on our virtual machine. That is shown [here](https://it2810-15.idi.ntnu.no/project2).

## Technical Requirements

> User interface should be based on React and programmed in TypeScript. The project should be set up with Vite.

The project is set up with Vite and is based on React and programmed in TypeScript.

> Use of state management, for example, redux, mobx, recoil, apollo local state management, etc.

We are using the react context api for state management.

> Custom/developer GraphQL backend, free choice of backend database server, but the project should use a backend database set up by the group.

We have a custom GraphQL backend with a SQLite or MySQL database depending on the user's choice.

> Use of good and relevant components and libraries (free choice and we encourage as much reuse of third-party solutions as possible).

Yes — Tailwind CSS with shadcn/ui components vendored as source. Seen in the [Readme](../README.md#tech-stack-and-why).

## Testing, development and Quality control Requirements

> Linting and use of Prettier

Yes we have also implemented linting pipeline with prettier.

> Completed testing of components (we use Vitest)

Yes we have implemented testing of components with Vitest. Where you can see how to test the components [here](../frontend/README.md#testing).

> Some form of automated end-to-end testing (in practice, testing a longer sequence of interactions), testing of the API.

End to end testing are documented [here](../frontend/README.md#end-to-end-tests).

> The project is documented with a README.md in the git repository. The documentation should discuss, explain, and refer to all the key choices and solutions made by the group (including choice of components and API).

Yes we have a [Readme](../README.md) that explains the key choices and solutions made by the group.

> The code should be readable and well-structured and commented so that it is easy to understand. The use of comments should be adapted for external inspection of the code.

We have commented the code so that it is easy to understand and read.

> The group should summarize each individual's contribution to the project along the way in a separate file submitted in BB (this is personal information that no one wants to be on git ;-)

We have submitted a file in BB that summarizes each individual's contribution to the project.

> Reproducibility: in practice, this means that the project should be documented and easy to install/run for others (e.g., the course instructor).

Yes we have a [Readme](../README.md#quickstart) that explains how to install and run the project.
