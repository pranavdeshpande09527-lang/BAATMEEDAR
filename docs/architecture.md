User entered.
1. User can input in three ways, direct statement, article link, YouTube link. 
If user gives a direct statement, it will be direct pass as a information. 
If article link, article link will be accessed through API Tavily, and extracted text will be saved in info. 
If YouTube link as a input, then we will use YouTube transcript using APIs and store YouTube transcript as a information. 

2. Then, information will be processed through API key of Gemini, which will remove opinion, extract claims, and find domain. Then, extracted claims and domain will be stored in Stage 2 information. 

3. Each claim according to the domain will be passed through all three agents. We will use hermes agent for planning the search strategy, Tavily api for web search, Groq API, and Gemini API, which will search for each claim domain-specific, extract information, store it in a file as a information level Stage 3. 

4. The Stage 3 information will be compared with Stage 2 information through Grok and Gemini individually. And final result will be individual from Grok and Gemini, which will compare both the information at Stage 2 and Stage 3, and give the result if the information is true or not. And also give the information about each claim.


