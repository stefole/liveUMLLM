const PlantUMLDiagramProvider = require('./PlantUMLDiagramProvider');

class PlantUMLClassProvider extends PlantUMLDiagramProvider {
    generate(targetClassName, classes, language) {
        const uml = [];
        uml.push('@startuml');
        uml.push('!pragma layout smetana');
        uml.push('left to right direction');

        // Styling
        uml.push('skinparam class {');
        uml.push('  BackgroundColor #FEFEFE');
        uml.push('  ArrowColor #2980b9');
        uml.push('  BorderColor #2980b9');
        uml.push('  FontStyle bold');
        uml.push('}');
        uml.push('skinparam class<<active>> {');
        uml.push('  BackgroundColor #E0F2FE');
        uml.push('  FontColor #0369A1');
        uml.push('  BorderColor #0284C7');
        uml.push('  BorderThickness 2');
        uml.push('}');
        uml.push('hide <<active>> stereotype');
        uml.push('skinparam shadowing false');
        uml.push('skinparam ranksep 40');
        uml.push('skinparam nodesep 20');

        if (!classes || !Array.isArray(classes) || classes.length === 0) {
            if (targetClassName) {
                uml.push(`class "${targetClassName}" [[command:extension.openClass?${targetClassName}]]`);
            }
            uml.push('@enduml');
            return { uml: uml.join('\n'), classCount: 0, displayClassNames: [] };
        }

        // Recursive helper to find all ancestors
        const findAncestors = (className, result = new Set()) => {
            if (!className || result.has(className)) return result;
            const cls = classes.find(c => c.name === className);
            if (cls) {
                result.add(className);
                if (cls.parent) findAncestors(cls.parent, result);
                if (cls.interfaces) cls.interfaces.forEach(iface => findAncestors(iface, result));
            } else {
                result.add(className);
            }
            return result;
        };

        // Recursive helper to find all descendants
        const findDescendants = (className, result = new Set(), visited = new Set()) => {
            if (!className || visited.has(className)) return result;
            visited.add(className);
            result.add(className);
            classes.forEach(c => {
                if (c.parent === className || (c.interfaces && c.interfaces.includes(className))) {
                    findDescendants(c.name, result, visited);
                }
            });
            return result;
        };

        // Find the target class or first class
        const targetClass = classes.find(c => c.name === targetClassName) || classes[0];
        const displaySet = new Set();

        if (targetClass) {
            // --- HIERARCHY TRAVERSAL ALGORITHM (Contextual Bounding) ---
            // To prevent massive, unreadable diagrams in large codebases, we scope 
            // the diagram strictly to the active class's context. This avoids the 
            // "distant cousin" explosion where pulling all descendants of all 
            // ancestors brings in unrelated features.

            // 1. Ancestors (Path Up): Get full hierarchy up to root parent.
            //    Ensures the user can see everything the active class inherits from.
            findAncestors(targetClass.name, displaySet);

            // 2. Descendants (Path Down): Find all children/grandchildren of the target class.
            //    Ensures the user can see everything that inherits from the active class.
            findDescendants(targetClass.name, displaySet);

            // 3. Immediate Siblings: Only classes that share the exact same parent/interfaces.
            //    Provides immediate context for siblings without traversing down their trees.
            if (targetClass.parent) {
                classes.forEach(c => {
                    if (c.parent === targetClass.parent) displaySet.add(c.name);
                });
            }
            if (targetClass.interfaces) {
                targetClass.interfaces.forEach(iface => {
                    classes.forEach(c => {
                        if (c.interfaces && c.interfaces.includes(iface)) displaySet.add(c.name);
                    });
                });
            }
            // -----------------------------------------------------------

            // Final pass: ensure every class in displaySet also has its parents/interfaces in displaySet
            // This fixes the issue where interfaces were only shown for the active class
            const currentDisplay = Array.from(displaySet);
            currentDisplay.forEach(name => {
                const cls = classes.find(c => c.name === name);
                if (cls) {
                    if (cls.parent) displaySet.add(cls.parent);
                    if (cls.interfaces) cls.interfaces.forEach(i => displaySet.add(i));
                }
            });
        }

        const displayClasses = new Map();
        displaySet.forEach(name => {
            const cls = classes.find(c => c.name === name);
            if (cls) {
                displayClasses.set(name, cls);
            } else {
                // Infer type from usage: if any known class implements this name,
                // treat it as an interface; otherwise treat it as a class.
                const isInterface = classes.some(c =>
                    c.interfaces && c.interfaces.includes(name)
                );
                displayClasses.set(name, { name, isExternal: true, isInterface });
            }
        });

        displayClasses.forEach(c => {
            // Guard: skip any entry that has no valid name (prevents blank `interface {` syntax errors)
            if (!c.name || !c.name.trim()) return;

            const type = c.isInterface ? 'interface' : 'class';
            // Add tooltip to indicate clickability. Remove link entirely if class is external (not in workspace).
            const tooltip = `Click to open ${c.name} and explore its hierarchy`;
            const link = c.isExternal ? '' : `[[command:extension.openClass?${c.name} {${tooltip}}]]`;

            if (c.name === targetClassName) {
                uml.push(`${type} ${c.name} <<active>> ${link} {`);
            } else {
                uml.push(`${type} ${c.name} ${link} {`);
            }

            if (c.methods && c.methods.length > 0) {
                c.methods.forEach(m => uml.push(`  +${m}()`));
            }

            // --- Information Scent: Show indicators for hidden relationships ---
            let hiddenSubclasses = 0;
            let hiddenParents = 0;

            // Count hidden subclasses
            classes.forEach(other => {
                if (other.parent === c.name || (other.interfaces && other.interfaces.includes(c.name))) {
                    if (!displaySet.has(other.name)) hiddenSubclasses++;
                }
            });

            // Count hidden parents/interfaces
            if (c.parent && !displaySet.has(c.parent)) hiddenParents++;
            if (c.interfaces) {
                c.interfaces.forEach(i => {
                    if (!displaySet.has(i)) hiddenParents++;
                });
            }

            // Add interactive indicators if there are hidden connections
            if (hiddenSubclasses > 0 || hiddenParents > 0) {
                uml.push('  ..');
                if (hiddenParents > 0) {
                    const text = hiddenParents > 1 ? 'more parents' : 'more parent';
                    uml.push(`  + <u><color:#2980b9>${hiddenParents} ${text} [+]</color></u>`);
                }
                if (hiddenSubclasses > 0) {
                    const text = hiddenSubclasses > 1 ? 'more children' : 'more child';
                    uml.push(`  + <u><color:#2980b9>${hiddenSubclasses} ${text} [+]</color></u>`);
                }
            }

            uml.push('}');
        });

        // Render relationships — use a Set to deduplicate so two classes with the
        // same parent+interface combination never produce duplicate arrows.
        const renderedEdges = new Set();
        classes.forEach(c => {
            if (!c.name || !displayClasses.has(c.name)) return;
            if (c.parent && displayClasses.has(c.parent)) {
                const edge = `${c.parent} <|-- ${c.name}`;
                if (!renderedEdges.has(edge)) {
                    renderedEdges.add(edge);
                    uml.push(edge);
                }
            }
            if (c.interfaces) {
                c.interfaces.forEach(iface => {
                    if (displayClasses.has(iface)) {
                        const edge = `${iface} <|.. ${c.name}`;
                        if (!renderedEdges.has(edge)) {
                            renderedEdges.add(edge);
                            uml.push(edge);
                        }
                    }
                });
            }
        });

        uml.push('@enduml');
        return {
            uml: uml.join('\n'),
            classCount: displayClasses.size,
            displayClassNames: Array.from(displaySet)
        };
    }
}
module.exports = PlantUMLClassProvider;
