import { DynamicTool } from "langchain/tools";
import * as cheerio from 'cheerio';
import { ToolLogger, BaseTool } from './tool.interface';

export class WebSearchTool implements BaseTool {
  createTool(logger: ToolLogger): DynamicTool {
    return new DynamicTool({
        name: "web_search",
        description: "Search the web for information about companies, topics, or current events. Returns comprehensive, well-formatted results with clickable links that provide context, facts, news, and resources.",
        func: async (query: string) => {
          try {
            logger.log(`Performing web search for: ${query}`);
            const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
              throw new Error(`Web search failed with status: ${response.status}`);
            }
            
            const html = await response.text();
            const $ = cheerio.load(html);
            
            // Extract search results with enhanced link extraction
            const results: Array<{title: string; snippet: string; url: string; domain?: string}> = [];
            
            $('.result__body').each((i, element) => {
              if (i >= 10) return; // Limit to top 10 results
              
              const title = $(element).find('.result__title').text().trim();
              const snippet = $(element).find('.result__snippet').text().trim();
              
              // Enhanced URL extraction from href attribute
              let url = '';
              let domain = '';
              const linkElement = $(element).find('.result__title a');
              if (linkElement.length > 0) {
                const href = linkElement.attr('href');
                if (href) {
                  // Extract the actual URL from DuckDuckGo redirect URL
                  const urlMatch = href.match(/uddg=([^&]+)/);
                  if (urlMatch && urlMatch[1]) {
                    url = decodeURIComponent(urlMatch[1]);
                    try {
                      // Extract domain for display
                      domain = new URL(url).hostname.replace('www.', '');
                    } catch (e) {
                      domain = '';
                    }
                  } else {
                    url = $(element).find('.result__url').text().trim();
                  }
                }
              } else {
                // Fallback to the displayed URL if href extraction fails
                url = $(element).find('.result__url').text().trim();
              }
              
              results.push({ title, snippet, url, domain });
            });
            
            if (results.length === 0) {
              return "No relevant information found for the query.";
            }
            
            // Format results in user-friendly format with clickable links
            let formattedResponse = `Here are some useful resources about ${query}:\n\n`;
            
            results.forEach((result) => {
              // Format domain display if available
              const domainDisplay = result.domain ? ` (${result.domain})` : '';
              formattedResponse += `${result.title}${domainDisplay}: ${result.snippet}\n${result.url}\n\n`;
            });
            
            // Add a note about the information being clickable
            formattedResponse += `These links provide comprehensive information about ${query}. Click any URL to learn more.`;
              return formattedResponse;
          } catch (error: any) {
            logger.error(`Web search error: ${error.message}`);
            return `Error performing web search: ${error.message}`;
          }
        },
      });
  }
}
